// ============================================================
// Content Gap Analyzer — Geothority
// Identifies missing/weak content by comparing user's site
// against competitor coverage and keyword opportunities.
// Generates topic clusters and content briefs.
// ============================================================

import { openai, DEFAULT_LLM_MODEL } from "@/lib/openai";
import { getCachedAI } from "@/lib/cached-ai";
import type {
  LocalKeyword,
  ContentGap,
  ContentGapType,
  ContentPageType,
  TopicCluster,
  ContentBrief,
  ContentOutlineSection,
  SchemaRecommendation,
  LocalOptimizationNotes,
  CompetitorContentExample,
} from "./types";

// ── Main Gap Analysis Function ────────────────────────────────────

export interface GapAnalysisInput {
  businessName: string;
  city: string;
  state: string;
  businessType: string;
  services: string[];
  websiteUrl: string | null;
  existingPages: ExistingPage[];
  keywords: LocalKeyword[];
  competitorDomains: string[];
}

export interface ExistingPage {
  url: string;
  title: string;
  type: ContentPageType | "other";
  wordCount: number | null;
  hasSchema: boolean;
  targetKeyword: string | null;
}

export async function analyzeContentGaps(
  input: GapAnalysisInput
): Promise<{ gaps: ContentGap[]; clusters: TopicCluster[]; briefs: ContentBrief[] }> {
  // Step 1: Identify content gaps via AI analysis
  const gaps = await identifyGaps(input);

  // Step 2: Cluster gaps into topic clusters
  const clusters = buildTopicClusters(gaps, input.keywords);

  // Step 3: Generate content briefs for top-priority gaps
  const briefs = await generateContentBriefs(clusters, input);

  return { gaps, clusters, briefs };
}

// ── Gap Identification ────────────────────────────────────────────

async function identifyGaps(input: GapAnalysisInput): Promise<ContentGap[]> {
  const { data } = await getCachedAI<ContentGap[]>(
    "content_gap_analysis",
    {
      businessName: input.businessName,
      city: input.city,
      state: input.state,
      businessType: input.businessType,
      services: input.services.sort().join(","),
      existingPages: input.existingPages.map((p) => `${p.url}|${p.type}|${p.wordCount || 0}|${p.hasSchema}`).join(";"),
      topKeywords: input.keywords.slice(0, 20).map((k) => k.term).join(","),
    },
    async () => {
      const prompt = `You are a local SEO content gap analyst. Analyze this business for content gaps.

BUSINESS: ${input.businessName}
LOCATION: ${input.city}, ${input.state}
TYPE: ${input.businessType}
SERVICES: ${input.services.join(", ")}
WEBSITE: ${input.websiteUrl || "unknown"}

EXISTING PAGES:
${input.existingPages.map((p) => `- ${p.url} | type: ${p.type} | words: ${p.wordCount || "unknown"} | schema: ${p.hasSchema} | keyword: ${p.targetKeyword || "none"}`).join("\n")}

TOP KEYWORD OPPORTUNITIES:
${input.keywords.slice(0, 20).map((k) => `- ${k.term} (volume: ${k.searchVolume || "?"}, intent: ${k.intent}, priority: ${k.priority})`).join("\n")}

COMPETITORS: ${input.competitorDomains.join(", ")}

Identify content gaps. For each gap provide:
1. gapType: one of: missing_page, thin_content, poor_optimization, missing_schema, missing_faq, competitor_advantage
2. pageType: one of: service, location, faq, blog, about, testimonial, comparison
3. targetKeyword: primary keyword this gap targets
4. supportingKeywords: 2-4 secondary keywords (array)
5. title: suggested page title
6. description: 1-2 sentence explanation of why this is a gap
7. impact: high, medium, or low
8. effort: low, medium, or high
9. recommendedActions: 2-3 specific actions to fill this gap (array of strings)
10. competitorExamples: array of {domain, url, title, wordCount, hasSchema} (1-2 examples)

Be thorough — typically 8-15 gaps for a business that hasn't done local SEO optimization.
Focus on HIGH IMPACT gaps first.

Return JSON: { "gaps": [...] }`;

      const completion = await openai.chat.completions.create({
        model: DEFAULT_LLM_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert local SEO content gap analyst for insurance businesses. Always return valid JSON. Be specific and actionable.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw);
      const gaps = (parsed.gaps || []) as Array<Record<string, unknown>>;

      return gaps.map((g: Record<string, unknown>, i: number): ContentGap => ({
        id: `gap-${i + 1}`,
        gapType: (g.gapType as ContentGapType) || "missing_page",
        pageType: (g.pageType as ContentPageType) || "service",
        targetKeyword: (g.targetKeyword as string) || "",
        supportingKeywords: (g.supportingKeywords as string[]) || [],
        title: (g.title as string) || "Untitled Gap",
        description: (g.description as string) || "",
        impact: (g.impact as ContentGap["impact"]) || "medium",
        effort: (g.effort as ContentGap["effort"]) || "medium",
        competitorExamples: ((g.competitorExamples as Array<Record<string, unknown>>) || []).map((c): CompetitorContentExample => ({
          domain: (c.domain as string) || "",
          url: (c.url as string) || "",
          title: (c.title as string) || "",
          wordCount: (c.wordCount as number) || null,
          hasSchema: (c.hasSchema as boolean) || false,
        })),
        recommendedActions: (g.recommendedActions as string[]) || [],
      }));
    }
  );

  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return data.sort((a, b) => (impactOrder[a.impact] ?? 1) - (impactOrder[b.impact] ?? 1));
}

// ── Topic Cluster Builder ─────────────────────────────────────────

function buildTopicClusters(
  gaps: ContentGap[],
  keywords: LocalKeyword[]
): TopicCluster[] {
  // Group gaps by pageType, then by keyword similarity
  const clusters: TopicCluster[] = [];
  const serviceGaps = gaps.filter((g) => g.pageType === "service");
  const locationGaps = gaps.filter((g) => g.pageType === "location");
  const faqGaps = gaps.filter((g) => g.pageType === "faq");
  const blogGaps = gaps.filter((g) => g.pageType === "blog");

  // Service clusters: one per service keyword
  const serviceKeywords = keywords.filter(
    (k) => k.intent === "transactional" || k.intent === "commercial_investigation"
  );
  const grouped = groupByStem(serviceKeywords);

  for (const [stem, group] of Object.entries(grouped)) {
    const pillarKw = group.sort((a, b) => b.priority - a.priority)[0];
    const matchingGaps = gaps.filter(
      (g) =>
        g.targetKeyword.toLowerCase().includes(stem) ||
        g.supportingKeywords.some((sk) => sk.toLowerCase().includes(stem))
    );

    clusters.push({
      id: `cluster-${stem.replace(/\s+/g, "-")}`,
      pillarKeyword: pillarKw.term,
      pillarTitle: toTitleCase(pillarKw.term),
      clusterKeywords: group,
      contentGaps: matchingGaps,
      suggestedPages: [], // filled in later
      totalEstimatedTraffic: group.reduce((sum, k) => sum + (k.searchVolume || 0), 0),
      priority: pillarKw.priority,
    });
  }

  // Add location cluster if gaps exist
  if (locationGaps.length > 0) {
    const locationKws = keywords.filter((k) => k.localRelevance >= 70);
    clusters.push({
      id: "cluster-location-pages",
      pillarKeyword: `${locationGaps[0].targetKeyword}`,
      pillarTitle: `Location Pages`,
      clusterKeywords: locationKws,
      contentGaps: locationGaps,
      suggestedPages: [],
      totalEstimatedTraffic: locationKws.reduce((sum, k) => sum + (k.searchVolume || 0), 0),
      priority: 85,
    });
  }

  // Add FAQ cluster
  if (faqGaps.length > 0) {
    const infoKws = keywords.filter((k) => k.intent === "informational");
    clusters.push({
      id: "cluster-faq-content",
      pillarKeyword: "FAQ & Answers",
      pillarTitle: "FAQ & Educational Content",
      clusterKeywords: infoKws,
      contentGaps: faqGaps,
      suggestedPages: [],
      totalEstimatedTraffic: infoKws.reduce((sum, k) => sum + (k.searchVolume || 0), 0),
      priority: 70,
    });
  }

  // Add blog cluster
  if (blogGaps.length > 0) {
    const blogKws = keywords.filter((k) => k.intent === "informational" && k.localRelevance < 70);
    clusters.push({
      id: "cluster-blog-content",
      pillarKeyword: "Blog & Guides",
      pillarTitle: "Blog & Educational Guides",
      clusterKeywords: blogKws,
      contentGaps: blogGaps,
      suggestedPages: [],
      totalEstimatedTraffic: blogKws.reduce((sum, k) => sum + (k.searchVolume || 0), 0),
      priority: 60,
    });
  }

  return clusters.sort((a, b) => b.priority - a.priority);
}

function groupByStem(keywords: LocalKeyword[]): Record<string, LocalKeyword[]> {
  const groups: Record<string, LocalKeyword[]> = {};

  for (const kw of keywords) {
    // Extract the service stem (first 1-2 meaningful words before city/modifier)
    const words = kw.term.split(" ");
    const cityIndex = words.findIndex((w) => w.toLowerCase() === "in" || w.length <= 3);
    const stem = words.slice(0, Math.max(2, cityIndex > 0 ? cityIndex : 2)).join(" ").toLowerCase();

    if (!groups[stem]) groups[stem] = [];
    groups[stem].push(kw);
  }

  return groups;
}

// ── Content Brief Generation ───────────────────────────────────────

async function generateContentBriefs(
  clusters: TopicCluster[],
  input: GapAnalysisInput
): Promise<ContentBrief[]> {
  const briefs: ContentBrief[] = [];

  // Generate briefs for top 5 clusters
  const topClusters = clusters.slice(0, 5);

  for (const cluster of topClusters) {
    const topGap = cluster.contentGaps[0];
    if (!topGap) continue;

    const brief = await generateSingleBrief(cluster, topGap, input);
    briefs.push(brief);
    cluster.suggestedPages.push(brief);
  }

  return briefs.sort((a, b) => b.priority - a.priority);
}

async function generateSingleBrief(
  cluster: TopicCluster,
  gap: ContentGap,
  input: GapAnalysisInput
): Promise<ContentBrief> {
  const { data } = await getCachedAI<ContentBrief>(
    "content_brief",
    {
      pillarKeyword: cluster.pillarKeyword,
      pageType: gap.pageType,
      city: input.city,
      state: input.state,
      businessName: input.businessName,
    },
    async () => {
      const prompt = `Create a detailed content brief for a local SEO page.

BUSINESS: ${input.businessName}
LOCATION: ${input.city}, ${input.state}
PAGE TYPE: ${gap.pageType}
TARGET KEYWORD: ${gap.targetKeyword}
SUPPORTING KEYWORDS: ${gap.supportingKeywords.join(", ")}
PILLAR KEYWORD: ${cluster.pillarKeyword}
GAP: ${gap.description}

SERVICES: ${input.services.join(", ")}
COMPETITOR EXAMPLES: ${gap.competitorExamples.map((c) => c.url).join(", ")}

Create a content brief with:
1. title: Page title
2. metaTitle: SEO meta title (under 60 chars)
3. metaDescription: SEO meta description (under 160 chars)
4. outline: Array of {heading, level (1-4), keyPoints (array of 2-4 strings), targetKeyword (optional), wordCountHint}
5. wordCountTarget: Target word count
6. secondaryKeywords: 3-5 secondary keywords to include
7. schemaRecommendation: {types: array of schema.org types, fields: suggested field values}
8. localOptimization: {cityMentions: number, neighborhoodReferences: array of 2-3 local neighborhoods, landmarkReferences: array of 2-3 local landmarks, nappConsistency: true, googleEmbedSuggested: boolean}
9. internalLinks: 3-4 suggested internal link anchors
10. estimatedImpact: high/medium/low

The outline should be thorough — 6-10 sections covering all aspects of the topic.
Include an FAQ section for service/location page types.

Return valid JSON matching the ContentBrief structure.`;

      const completion = await openai.chat.completions.create({
        model: DEFAULT_LLM_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a local SEO content strategist. Create detailed, actionable content briefs. Return valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw);

      return {
        id: `brief-${gap.id}`,
        pageType: gap.pageType,
        targetKeyword: gap.targetKeyword,
        secondaryKeywords: parsed.secondaryKeywords || gap.supportingKeywords,
        title: parsed.title || gap.title,
        metaTitle: parsed.metaTitle || "",
        metaDescription: parsed.metaDescription || "",
        outline: (parsed.outline || []).map((s: any): ContentOutlineSection => ({
          heading: s.heading || "",
          level: s.level || 2,
          keyPoints: s.keyPoints || [],
          targetKeyword: s.targetKeyword,
          wordCountHint: s.wordCountHint || 150,
        })),
        wordCountTarget: parsed.wordCountTarget || 1200,
        internalLinks: parsed.internalLinks || [],
        schemaRecommendation: {
          types: parsed.schemaRecommendation?.types || ["LocalBusiness"],
          fields: parsed.schemaRecommendation?.fields || {},
        },
        localOptimization: parsed.localOptimization || {
          cityMentions: 8,
          neighborhoodReferences: [],
          landmarkReferences: [],
          nappConsistency: true,
          googleEmbedSuggested: true,
        },
        competitorReferences: gap.competitorExamples.map((c) => c.url),
        estimatedImpact: gap.impact,
        priority: gap.impact === "high" ? 90 : gap.impact === "medium" ? 60 : 30,
      } as ContentBrief;
    }
  );

  return data;
}

// ── Helpers ───────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
