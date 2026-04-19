// ============================================================
// Content Generation Module – Main Service
// Orchestrates brief generation → content drafting → SEO validation
// ============================================================

import { DEFAULT_LLM_MODEL, openai } from "@/lib/openai";
import { BASE_SYSTEM_PROMPT, buildBriefPrompt, buildContentPrompt } from "./prompts";
import { validateSEO } from "./seo-checklist";
import type {
  ContentBrief,
  ContentGenerationRequest,
  GeneratedContentOutput,
  ContentType,
} from "./types";

// ── Step 1: Generate a Content Brief ─────────────────────────────

export async function generateBrief(params: {
  contentType: ContentType;
  businessName: string;
  city: string;
  state?: string;
  service?: string;
  targetKeyword?: string;
  industry?: string;
  competitorContext?: string;
}): Promise<ContentBrief> {
  const prompt = buildBriefPrompt(params);

  const response = await openai.chat.completions.create({
    model: DEFAULT_LLM_MODEL,
    messages: [
      { role: "system", content: BASE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  const brief: ContentBrief = JSON.parse(raw);
  brief.id = brief.id || `brief_${Date.now()}`;
  brief.contentType = params.contentType;
  brief.createdAt = new Date().toISOString();

  return brief;
}

// ── Step 2: Generate Content from a Brief ─────────────────────────

export async function generateContent(params: ContentGenerationRequest): Promise<{
  output: GeneratedContentOutput;
  brief: ContentBrief;
}> {
  // Use provided brief or generate one
  const brief: ContentBrief = params.brief || await generateBrief({
    contentType: params.contentType,
    businessName: params.businessName,
    city: params.city,
    state: params.state,
    service: params.service,
    targetKeyword: params.targetKeyword || params.service,
    industry: params.industry,
    competitorContext: params.competitorContext,
  });

  const prompt = buildContentPrompt(brief, params.businessName, params.agentName, params.industry);

  const response = await openai.chat.completions.create({
    model: DEFAULT_LLM_MODEL,
    messages: [
      { role: "system", content: BASE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    max_tokens: 4000,
    temperature: 0.8,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);

  // Run SEO validation
  const seoChecklist = validateSEO({
    title: parsed.title || "",
    metaTitle: parsed.metaTitle || "",
    metaDescription: parsed.metaDescription || "",
    contentHtml: parsed.contentHtml || "",
    contentMarkdown: parsed.contentMarkdown || "",
    city: brief.localRelevance.city,
    primaryKeyword: brief.seoTargets.primaryKeyword,
    cityMentionRange: brief.seoTargets.cityMentionRange,
    targetWordCount: brief.seoTargets.targetWordCount,
  });

  const output: GeneratedContentOutput = {
    title: parsed.title || "",
    metaTitle: parsed.metaTitle || "",
    metaDescription: parsed.metaDescription || "",
    contentHtml: parsed.contentHtml || "",
    contentMarkdown: parsed.contentMarkdown || "",
    schema: parsed.schema || {},
    summary: parsed.summary || "",
    qualityScore: seoChecklist.overallScore,
    seoChecklist,
  };

  return { output, brief };
}

// ── Step 3: Stream Content Generation (for SSE API routes) ────────

export async function* streamContentGeneration(params: ContentGenerationRequest): AsyncGenerator<
  | { type: "brief"; brief: ContentBrief }
  | { type: "token"; token: string }
  | { type: "done"; output: GeneratedContentOutput; brief: ContentBrief }
  | { type: "error"; error: string }
> {
  try {
    // Generate brief first (non-streaming)
    const brief: ContentBrief = params.brief || await generateBrief({
      contentType: params.contentType,
      businessName: params.businessName,
      city: params.city,
      state: params.state,
      service: params.service,
      targetKeyword: params.targetKeyword || params.service,
      industry: params.industry,
      competitorContext: params.competitorContext,
    });

    yield { type: "brief", brief };

    // Stream the content generation
    const prompt = buildContentPrompt(brief, params.businessName, params.agentName, params.industry);

    const stream = await openai.chat.completions.create({
      model: DEFAULT_LLM_MODEL,
      messages: [
        { role: "system", content: BASE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.8,
      response_format: { type: "json_object" },
      stream: true,
    });

    let fullContent = "";

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        fullContent += token;
        yield { type: "token", token };
      }

      if (chunk.choices[0]?.finish_reason === "stop") {
        let parsed: Record<string, any> = {};
        try {
          parsed = JSON.parse(fullContent);
        } catch {
          yield { type: "error", error: "Failed to parse AI response" };
          return;
        }

        const seoChecklist = validateSEO({
          title: parsed.title || "",
          metaTitle: parsed.metaTitle || "",
          metaDescription: parsed.metaDescription || "",
          contentHtml: parsed.contentHtml || "",
          contentMarkdown: parsed.contentMarkdown || "",
          city: brief.localRelevance.city,
          primaryKeyword: brief.seoTargets.primaryKeyword,
          cityMentionRange: brief.seoTargets.cityMentionRange,
          targetWordCount: brief.seoTargets.targetWordCount,
        });

        const output: GeneratedContentOutput = {
          title: parsed.title || "",
          metaTitle: parsed.metaTitle || "",
          metaDescription: parsed.metaDescription || "",
          contentHtml: parsed.contentHtml || "",
          contentMarkdown: parsed.contentMarkdown || "",
          schema: parsed.schema || {},
          summary: parsed.summary || "",
          qualityScore: seoChecklist.overallScore,
          seoChecklist,
        };

        yield { type: "done", output, brief };
      }
    }
  } catch (err) {
    yield { type: "error", error: err instanceof Error ? err.message : "Content generation failed" };
  }
}

// ── Re-export types ──────────────────────────────────────────────

export * from "./types";
