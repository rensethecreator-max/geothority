import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { city, service, businessName, agentName, scanId } = await req.json();

    if (!city || !service || !businessName) {
      return NextResponse.json(
        { error: "City, service, and business name are required" },
        { status: 400 }
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

    const completion = await openai.chat.completions.create({
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
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let generated;
    try {
      generated = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const { data: content, error } = await supabase
      .from("generated_content")
      .insert({
        user_id: user.id,
        scan_id: scanId || null,
        type: "landing_page",
        city,
        service,
        title: generated.title || `${service} in ${city}`,
        meta_description: generated.metaDescription || "",
        content_html: generated.contentHtml || "",
        content_markdown: generated.contentMarkdown || "",
        schema_json: generated.schema || null,
        quality_score: generated.qualityScore || 80,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to save generated content" },
        { status: 500 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Content generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
