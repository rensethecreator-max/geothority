import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";
import { streamContentGeneration } from "@/lib/content-generation";
import type { ContentType, ContentBrief } from "@/lib/content-generation";

export async function POST(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "authority");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const {
      contentType = "landing_page",
      city,
      service,
      businessName,
      agentName,
      scanId,
      industry,
      targetKeyword,
      competitorContext,
      brief, // optional pre-generated brief
    } = await req.json();

    if (!city || !businessName) {
      return new Response(
        JSON.stringify({ error: "City and business name are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate content type
    const validTypes: ContentType[] = ["landing_page", "blog_post", "service_page", "localized_faq", "trust_page", "about"];
    if (!validTypes.includes(contentType)) {
      return new Response(
        JSON.stringify({ error: `Invalid content type. Valid: ${validTypes.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const parsedBrief: ContentBrief | undefined = brief ? JSON.parse(brief) : undefined;

    const encoder = new TextEncoder();
    let finalOutput: Record<string, unknown> | null = null;
    let finalBrief: ContentBrief | null = null;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamContentGeneration({
            contentType,
            businessName,
            agentName,
            city,
            service,
            targetKeyword,
            scanId,
            industry,
            competitorContext,
            brief: parsedBrief,
          })) {
            if (event.type === "brief") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "brief", brief: event.brief })}\n\n`)
              );
            } else if (event.type === "token") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "token", token: event.token })}\n\n`)
              );
            } else if (event.type === "error") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", error: event.error })}\n\n`)
              );
              controller.close();
              return;
            } else if (event.type === "done") {
              finalOutput = {
                title: event.output.title,
                metaTitle: event.output.metaTitle,
                metaDescription: event.output.metaDescription,
                contentHtml: event.output.contentHtml,
                contentMarkdown: event.output.contentMarkdown,
                schema: event.output.schema,
                summary: event.output.summary,
                qualityScore: event.output.qualityScore,
                seoChecklist: event.output.seoChecklist,
              };
              finalBrief = event.brief;
            }
          }

          // Save to Supabase
          if (finalOutput && finalBrief) {
            const { data: content, error } = await supabase
              .from("generated_content")
              .insert({
                user_id: user.id,
                scan_id: scanId || null,
                type: contentType,
                city,
                service: service || null,
                title: (finalOutput.title as string) || `${service || contentType} in ${city}`,
                meta_description: (finalOutput.metaDescription as string) || "",
                content_html: (finalOutput.contentHtml as string) || "",
                content_markdown: (finalOutput.contentMarkdown as string) || "",
                schema_json: (finalOutput.schema as Record<string, unknown>) || null,
                quality_score: (finalOutput.qualityScore as number) || 80,
                status: "draft",
              })
              .select()
              .single();

            if (error) {
              console.error("Supabase insert error:", error);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Failed to save content" })}\n\n`)
              );
            } else {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "done", content, brief: finalBrief, output: finalOutput })}\n\n`
                )
              );
            }
          }

          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Stream failed" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Content generation error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate content" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
