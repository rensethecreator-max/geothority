import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";
import { requirePlan } from "@/lib/plan-gate";

export async function POST(req: NextRequest) {
  try {
    // AI content generation requires authority plan or above
    const gate = await requirePlan(req, "authority");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const { city, service, businessName, agentName, scanId } = await req.json();

    if (!city || !service || !businessName) {
      return new Response(
        JSON.stringify({ error: "City, service, and business name are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = `Generate a complete, SEO-optimized landing page for a local insurance agency. Follow these specifications exactly:

BUSINESS DETAILS:
- Agency Name: ${businessName}
- Agent Name: ${agentName || "Our Team"}
- City: ${city}
- Service: ${service}

REQUIREMENTS:
1. Write 800-1200 words of unique, locally-relevant content
2. Include the city name naturally 8-12 times throughout
3. Reference 2-3 local landmarks, neighborhoods, or geographic features specific to ${city}
4. Include insurance-specific trust signals (licensing, years of experience, carrier partnerships)
5. Include a compelling H1 title with city + service keywords
6. Include 3-5 subheadings (H2/H3)
7. Include a FAQ section with 4-5 questions and answers
8. Write a meta title (under 60 chars) and meta description (under 160 chars)
9. Include a clear call-to-action

OUTPUT FORMAT (JSON):
{
  "title": "Page H1 title",
  "metaTitle": "SEO meta title under 60 chars",
  "metaDescription": "SEO meta description under 160 chars",
  "contentHtml": "Full HTML content with semantic markup",
  "contentMarkdown": "Same content in markdown",
  "schema": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [...]
  },
  "qualityScore": 85
}

Return ONLY valid JSON, no markdown fences.`;

    // Stream the response
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert local SEO content writer specializing in insurance agency websites. You create high-quality, locally-relevant content that ranks well in search and AI-powered answers. Always output valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.8,
      response_format: { type: "json_object" },
      stream: true,
    });

    const encoder = new TextEncoder();
    let fullContent = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || "";
            if (token) {
              fullContent += token;
              const sseEvent = `data: ${JSON.stringify({ token })}\n\n`;
              controller.enqueue(encoder.encode(sseEvent));
            }

            // Check for finish
            if (chunk.choices[0]?.finish_reason === "stop") {
              // Parse and save to Supabase
              let generated: Record<string, unknown> = {};
              try {
                generated = JSON.parse(fullContent);
              } catch {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ error: "Failed to parse AI response" })}\n\n`)
                );
                controller.close();
                return;
              }

              const { data: content, error } = await supabase
                .from("generated_content")
                .insert({
                  user_id: user.id,
                  scan_id: scanId || null,
                  type: "landing_page",
                  city,
                  service,
                  title: (generated.title as string) || `${service} in ${city}`,
                  meta_description: (generated.metaDescription as string) || "",
                  content_html: (generated.contentHtml as string) || "",
                  content_markdown: (generated.contentMarkdown as string) || "",
                  schema_json: (generated.schema as Record<string, unknown>) || null,
                  quality_score: (generated.qualityScore as number) || 80,
                  status: "draft",
                })
                .select()
                .single();

              if (error) {
                console.error("Supabase insert error:", error);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ error: "Failed to save content" })}\n\n`)
                );
              } else {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ done: true, content })}\n\n`)
                );
              }
              controller.close();
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`)
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
