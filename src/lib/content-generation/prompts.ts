// ============================================================
// Content Generation Module – Prompt Templates
// ============================================================

import type { ContentType, ContentBrief, LocalRelevanceConfig, AISummarizationConfig } from "./types";

/** System prompt shared across all content generation */
const BASE_SYSTEM_PROMPT = `You are an expert local SEO content writer. You create high-quality, locally-relevant content that:
1. Ranks well in traditional search (Google organic + Maps)
2. Is easily summarized by AI systems (Google AI Overview, ChatGPT, Perplexity)
3. Uses natural city mentions tied to real local landmarks and neighborhoods
4. Includes proper semantic HTML structure and heading hierarchy
5. Contains trust signals (licensing, experience, local expertise)
6. Always outputs valid JSON — no markdown fences, no commentary.`;

/** Prompt templates per content type */
const CONTENT_TYPE_PROMPTS: Record<ContentType, string> = {
  landing_page: `Generate a complete, SEO-optimized local landing page for {industry}. Requirements:
- 800-1200 words of unique, locally-relevant content
- Include the city name naturally 8-12 times
- Reference 2-3 local landmarks, neighborhoods, or geographic features
- Include trust signals (licensing, years of experience, carrier partnerships)
- Compelling H1 with city + service keywords
- 3-5 subheadings (H2/H3)
- FAQ section with 4-5 questions and answers
- Meta title (<60 chars) and meta description (<160 chars)
- Clear call-to-action`,

  blog_post: `Generate a complete, SEO-optimized blog post for {industry}. Requirements:
- 1200-1800 words of engaging, informative content
- Include the city name naturally 5-8 times
- Reference 2-3 local landmarks, events, or neighborhood details
- Use a conversational yet authoritative tone
- Compelling H1 that includes the primary keyword naturally
- 4-6 subheadings (H2/H3) with logical flow
- Include actionable tips or numbered lists
- Reference 1-2 relevant statistics or data points
- Meta title (<60 chars) and meta description (<160 chars)
- End with a soft CTA tying back to the business
- Include a 2-3 sentence TL;DR summary at the top for AI summarization`,

  service_page: `Generate a complete, SEO-optimized service page for {industry}. Requirements:
- 900-1300 words of detailed service-focused content
- Include the city name naturally 8-12 times
- Reference local needs, regulations, or geographic specifics for {city}
- Explain the service clearly: what it covers, who needs it, why it matters locally
- Include pricing transparency language (ranges, "starting at", or "varies by")
- Trust signals: credentials, years in business, carrier partnerships
- H1 with city + service keywords
- 4-5 subheadings (H2/H3) covering: overview, what's covered, who needs it, how to get started, local considerations
- FAQ section with 3-4 questions
- Meta title (<60 chars) and meta description (<160 chars)
- Strong CTA with multiple contact options
- Include a 2-3 sentence TL;DR summary at the top for AI summarization`,

  localized_faq: `Generate a comprehensive, localized FAQ page for {industry} in {city}. Requirements:
- 600-900 words total across 8-12 question-answer pairs
- Each answer should be 40-80 words (concise for AI Overview extraction)
- Include city name naturally 4-6 times across answers
- Mix factual questions ("What does X cover?") with local questions ("How does {city}'s weather affect X?")
- Include at least 2 "People Also Ask" style questions
- Format with H2 for each question, or H3 under thematic H2 groupings
- Answers should use definitive language ("Yes,..." / "Typically,..." / "In {city},...")
- Meta title (<60 chars) and meta description (<160 chars)
- TL;DR summary at top for AI summarization`,

  trust_page: `Generate a trust/about page for {industry}. Requirements:
- 500-800 words
- Emphasize local roots, community involvement, licensing, and credentials
- Reference 2-3 local community connections
- H1 with business name + city
- Meta title (<60 chars) and meta description (<160 chars)`,

  about: `Generate an about page for {industry}. Requirements:
- 500-800 words
- Tell the business story with local flavor
- Reference founding story, community ties, team expertise
- H1 with business name
- Meta title (<60 chars) and meta description (<160 chars)`,
};

/** Build the full prompt for content brief generation */
export function buildBriefPrompt(params: {
  contentType: ContentType;
  businessName: string;
  city: string;
  state?: string;
  service?: string;
  targetKeyword?: string;
  industry?: string;
  competitorContext?: string;
}): string {
  const industry = params.industry || "insurance";
  const location = params.state ? `${params.city}, ${params.state}` : params.city;

  return `Create a detailed content brief for a ${params.contentType.replace(/_/g, " ")} that will rank in Google search and AI Overview results.

BUSINESS: ${params.businessName}
INDUSTRY: ${industry}
LOCATION: ${location}
${params.service ? `SERVICE: ${params.service}` : ""}
${params.targetKeyword ? `PRIMARY KEYWORD: ${params.targetKeyword}` : ""}
${params.competitorContext ? `COMPETITOR INSIGHT: ${params.competitorContext}` : ""}

The brief should include:
1. Proposed title, meta title, meta description
2. Detailed outline with 4-8 sections, each with heading, heading level, key points, and target word count
3. SEO targets: primary keyword, 3-5 secondary keywords, city mention range
4. Local relevance: 3-5 specific landmarks, neighborhoods, or geographic features to reference
5. AI summarization config: whether to include TL;DR, structured data, PAA questions
6. Target audience description
7. Tone and style guidance

OUTPUT FORMAT (JSON):
{
  "id": "brief_{{timestamp}}",
  "contentType": "${params.contentType}",
  "title": "Proposed page title",
  "metaTitle": "Meta title under 60 chars",
  "metaDescription": "Meta description under 160 chars",
  "outline": [
    { "heading": "Section heading", "headingLevel": 2, "keyPoints": ["point1", "point2"], "targetWordCount": 200, "localRelevanceHint": "Reference downtown area" }
  ],
  "seoTargets": {
    "primaryKeyword": "...",
    "secondaryKeywords": ["..."],
    "city": "${params.city}",
    "state": "${params.state || ''}",
    "targetWordCount": { "min": 800, "max": 1200 },
    "cityMentionRange": { "min": 6, "max": 10 }
  },
  "localRelevance": {
    "city": "${params.city}",
    "state": "${params.state || ''}",
    "landmarks": ["landmark1", "landmark2", "landmark3"],
    "neighborhoods": ["neighborhood1", "neighborhood2"],
    "nearbyCities": ["nearby1", "nearby2"],
    "localStatistics": "Relevant stat about the city/area"
  },
  "aiConfig": {
    "includeSummary": true,
    "includeStructuredData": true,
    "strictHeadingHierarchy": true,
    "includePAAQuestions": ${params.contentType === "localized_faq" || params.contentType === "blog_post"}
  },
  "targetAudience": "Description of target reader",
  "toneAndStyle": "Professional yet approachable, locally knowledgeable",
  "suggestedInternalLinks": ["service page URL", "FAQ page URL"]
}

Return ONLY valid JSON.`;
}

/** Build the full prompt for content generation from a brief */
export function buildContentPrompt(brief: ContentBrief, businessName: string, agentName?: string, industry?: string): string {
  const ind = industry || "insurance";
  const template = CONTENT_TYPE_PROMPTS[brief.contentType] || CONTENT_TYPE_PROMPTS.landing_page;
  const filledTemplate = template
    .replace(/\{industry\}/g, ind)
    .replace(/\{city\}/g, brief.localRelevance.city);

  const landmarks = brief.localRelevance.landmarks?.join(", ") || "locally recognized landmarks";
  const neighborhoods = brief.localRelevance.neighborhoods?.join(", ") || "well-known neighborhoods";
  const secondaryKws = brief.seoTargets.secondaryKeywords.join(", ");

  let outlineInstructions = brief.outline
    .map((s) => `- H${s.headingLevel}: "${s.heading}" (~${s.targetWordCount} words) — Key points: ${s.keyPoints.join("; ")}${s.localRelevanceHint ? ` | Local angle: ${s.localRelevanceHint}` : ""}`)
    .join("\n");

  return `Generate content following this content brief exactly.

BUSINESS: ${businessName}
${agentName ? `AGENT: ${agentName}` : ""}
INDUSTRY: ${ind}
CITY: ${brief.localRelevance.city}${brief.localRelevance.state ? `, ${brief.localRelevance.state}` : ""}
SERVICE: ${brief.seoTargets.primaryKeyword}

CONTENT TYPE: ${brief.contentType.replace(/_/g, " ")}
TARGET WORD COUNT: ${brief.seoTargets.targetWordCount.min}-${brief.seoTargets.targetWordCount.max}
CITY MENTION RANGE: ${brief.seoTargets.cityMentionRange.min}-${brief.seoTargets.cityMentionRange.max}

PRIMARY KEYWORD: ${brief.seoTargets.primaryKeyword}
SECONDARY KEYWORDS: ${secondaryKws}

LOCAL RELEVANCE:
- Landmarks to reference: ${landmarks}
- Neighborhoods to reference: ${neighborhoods}
${brief.localRelevance.nearbyCities?.length ? `- Nearby cities: ${brief.localRelevance.nearbyCities.join(", ")}` : ""}
${brief.localRelevance.localStatistics ? `- Local stat: ${brief.localRelevance.localStatistics}` : ""}

AI SUMMARIZATION:
- Include TL;DR summary: ${brief.aiConfig.includeSummary ? "YES" : "NO"}
- Include structured data (schema): ${brief.aiConfig.includeStructuredData ? "YES" : "NO"}
- Strict heading hierarchy: ${brief.aiConfig.strictHeadingHierarchy ? "YES" : "NO"}
- Include PAA questions: ${brief.aiConfig.includePAAQuestions ? "YES" : "NO"}

OUTLINE (follow this structure):
${outlineInstructions}

TONE: ${brief.toneAndStyle}
AUDIENCE: ${brief.targetAudience}

${filledTemplate}

OUTPUT FORMAT (JSON):
{
  "title": "H1 title",
  "metaTitle": "SEO meta title under 60 chars",
  "metaDescription": "SEO meta description under 160 chars",
  "summary": "2-3 sentence TL;DR for AI summarization",
  "contentHtml": "Full HTML with semantic markup (h1, h2, h3, p, ul, li, strong, etc.)",
  "contentMarkdown": "Same content in markdown format",
  "schema": { "@context": "https://schema.org", "@type": "...", ... },
  "qualityScore": 85
}

Return ONLY valid JSON.`;
}

export { BASE_SYSTEM_PROMPT };
