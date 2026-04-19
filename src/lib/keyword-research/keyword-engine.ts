// ============================================================
// Local Keyword Research Engine — Geothority
// AI-driven local keyword discovery, PAA extraction, competitor
// keyword analysis, and priority scoring.
// ============================================================

import { openai, DEFAULT_LLM_MODEL } from "@/lib/openai";
import { getCachedAI } from "@/lib/cached-ai";
import type {
  LocalKeyword,
  KeywordIntent,
  KeywordDifficulty,
  CompetitorRanking,
  SerpFeature,
} from "./types";

// ── Configuration ─────────────────────────────────────────────────

const KEYWORD_CATEGORIES = {
  core_services: (services: string[], city: string) =>
    services.flatMap((s) => [
      `${s} ${city}`,
      `${s} in ${city}`,
      `${city} ${s}`,
      `best ${s} ${city}`,
      `affordable ${s} ${city}`,
      `${s} near me ${city}`,
      `${s} companies ${city}`,
    ]),
  long_tail: (services: string[], city: string, state: string) =>
    services.flatMap((s) => [
      `how much is ${s} in ${city} ${state}`,
      `${s} rates ${city}`,
      `cheap ${s} ${city} ${state}`,
      `${s} quotes ${city}`,
      `compare ${s} ${city}`,
      `${s} agent ${city}`,
      `local ${s} ${city}`,
      `${s} office ${city} ${state}`,
    ]),
  informational: (services: string[], city: string) =>
    services.flatMap((s) => [
      `what does ${s} cover in ${city}`,
      `${s} requirements ${city} ${state}`,
      `do I need ${s} in ${city}`,
      `how to file ${s} claim ${city}`,
      `${s} discounts ${city}`,
    ]),
  comparison: (services: string[], city: string, state: string) =>
    services.flatMap((s) => [
      `${s} vs other ${city}`,
      `${city} ${s} reviews`,
      `top rated ${s} ${city}`,
      `${s} companies comparison ${city}`,
    ]),
};

const INTENT_PATTERNS: { pattern: RegExp; intent: KeywordIntent }[] = [
  { pattern: /(?:buy|cheap|affordable|quote|cost|price|rate|hire|near me|best|top)/i, intent: "transactional" },
  { pattern: /(?:compare|vs|review|top rated|companies)/i, intent: "commercial_investigation" },
  { pattern: /(?:how|what|why|do I|guide|tips|requirements)/i, intent: "informational" },
  { pattern: /(?:office|agent|location|visit|directions)/i, intent: "navigational" },
];

// ── Main Research Function ────────────────────────────────────────

export interface KeywordResearchInput {
  businessName: string;
  city: string;
  state: string;
  businessType: string;
  services: string[];
  competitorDomains: string[];
}

export async function researchLocalKeywords(
  input: KeywordResearchInput
): Promise<LocalKeyword[]> {
  // Step 1: Generate seed keyword list from templates
  const seedKeywords = generateSeedKeywords(input);

  // Step 2: Use AI to expand, validate, and score keywords
  const enrichedKeywords = await enrichKeywordsWithAI(seedKeywords, input);

  // Step 3: Extract PAA questions
  const paaQuestions = await extractPeopleAlsoAsk(input);

  // Step 4: Merge PAA into keyword data
  const merged = mergePAAIntoKeywords(enrichedKeywords, paaQuestions);

  // Step 5: Calculate composite priority scores
  return calculatePriorities(merged);
}

// ── Seed Keyword Generation ──────────────────────────────────────

function generateSeedKeywords(input: KeywordResearchInput): string[] {
  const { services, city, state } = input;
  const allKeywords: string[] = [];

  for (const category of Object.values(KEYWORD_CATEGORIES)) {
    allKeywords.push(...category(services, city, state));
  }

  // Deduplicate
  return Array.from(new Set(allKeywords));
}

// ── AI-Powered Keyword Enrichment ─────────────────────────────────

interface AIKeywordResult {
  term: string;
  searchVolume: number | null;
  difficulty: KeywordDifficulty | null;
  intent: KeywordIntent;
  cpc: number | null;
  localRelevance: number;
  peopleAlsoAsk: string[];
  relatedTerms: string[];
  serpFeatures: string[];
}

async function enrichKeywordsWithAI(
  seedKeywords: string[],
  input: KeywordResearchInput
): Promise<LocalKeyword[]> {
  const { data, fromCache } = await getCachedAI<AIKeywordResult[]>(
    "keyword_research",
    {
      businessName: input.businessName,
      city: input.city,
      state: input.state,
      businessType: input.businessType,
      services: input.services.sort().join(","),
      seeds_hash: seedKeywords.sort().join("|").slice(0, 200),
    },
    async () => {
      const prompt = `You are an expert local SEO keyword researcher. Analyze the following seed keywords for a ${input.businessType} business "${input.businessName}" in ${input.city}, ${input.state}.

SERVICES: ${input.services.join(", ")}

SEED KEYWORDS (analyze the top 40 most promising):
${seedKeywords.slice(0, 40).join("\n")}

For each keyword, provide:
1. Estimated monthly search volume (0-10000, be realistic for a local market)
2. Difficulty: easy, medium, hard, very_hard
3. Intent: transactional, informational, navigational, commercial_investigation
4. Estimated CPC in USD (0-50, typical for insurance vertical)
5. Local relevance score (0-100, how specific to local search)
6. 2-3 "People Also Ask" questions related to this keyword
7. 2-3 related keyword variations
8. SERP features present: local_pack, featured_snippet, people_also_ask, knowledge_panel, image_pack, video, sitelinks

Also identify 10-15 additional high-value local keywords NOT in the seed list that this business should target.

Return a JSON array of objects with keys: term, searchVolume, difficulty, intent, cpc, localRelevance, peopleAlsoAsk, relatedTerms, serpFeatures.`;

      const completion = await openai.chat.completions.create({
        model: DEFAULT_LLM_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a local SEO keyword research expert. Always return valid JSON arrays. Be realistic about local search volumes — a city of 50k-500k people won't have 10k searches for niche insurance terms. Prioritize high-intent commercial keywords.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 6000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw);
      return (parsed.keywords || parsed.data || parsed) as AIKeywordResult[];
    }
  );

  // Map AI results to LocalKeyword type
  return data.map((kw: AIKeywordResult): LocalKeyword => ({
    term: kw.term,
    searchVolume: kw.searchVolume,
    difficulty: kw.difficulty,
    intent: kw.intent || classifyIntent(kw.term),
    cpc: kw.cpc,
    localRelevance: kw.localRelevance ?? 50,
    currentRanking: null, // would need live rank tracking
    competitorRankings: [], // populated separately
    serpFeatures: (kw.serpFeatures || []).map((f: string): SerpFeature => ({
      type: f as SerpFeature["type"],
      present: true,
    })),
    peopleAlsoAsk: kw.peopleAlsoAsk || [],
    relatedTerms: kw.relatedTerms || [],
    priority: 0, // calculated later
  }));
}

// ── People Also Ask Extraction ────────────────────────────────────

async function extractPeopleAlsoAsk(
  input: KeywordResearchInput
): Promise<Record<string, string[]>> {
  const { data } = await getCachedAI<Record<string, string[]>>(
    "paa_research",
    {
      city: input.city,
      state: input.state,
      businessType: input.businessType,
      services: input.services.sort().join(","),
    },
    async () => {
      const prompt = `For a ${input.businessType} business in ${input.city}, ${input.state}, provide "People Also Ask" questions for each service category.

Services: ${input.services.join(", ")}

For each service, list 5-8 real PAA-style questions people search for locally.

Return JSON object where keys are service names and values are arrays of question strings.`;

      const completion = await openai.chat.completions.create({
        model: DEFAULT_LLM_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a local SEO expert specializing in PAA research. Return valid JSON. Questions should sound natural and specific to local search behavior.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      return JSON.parse(raw);
    }
  );

  return data;
}

// ── Merge PAA into Keywords ───────────────────────────────────────

function mergePAAIntoKeywords(
  keywords: LocalKeyword[],
  paaByService: Record<string, string[]>
): LocalKeyword[] {
  // Create additional keyword entries from PAA questions
  const paaKeywords: LocalKeyword[] = [];

  for (const [service, questions] of Object.entries(paaByService)) {
    for (const q of questions) {
      paaKeywords.push({
        term: q.toLowerCase(),
        searchVolume: null,
        difficulty: "medium",
        intent: "informational",
        cpc: null,
        localRelevance: 70,
        currentRanking: null,
        competitorRankings: [],
        serpFeatures: [{ type: "people_also_ask", present: true }],
        peopleAlsoAsk: [],
        relatedTerms: [],
        priority: 0,
      });
    }

    // Also enrich existing keywords with their PAA questions
    for (const kw of keywords) {
      if (kw.term.toLowerCase().includes(service.toLowerCase())) {
        kw.peopleAlsoAsk = [...new Set([...kw.peopleAlsoAsk, ...questions])];
      }
    }
  }

  // Deduplicate by term
  const termSet = new Set(keywords.map((k) => k.term.toLowerCase()));
  const uniquePaa = paaKeywords.filter((k) => !termSet.has(k.term.toLowerCase()) && !paaKeywords.some((existing) => existing !== k && existing.term.toLowerCase() === k.term.toLowerCase()));

  return [...keywords, ...uniquePaa];
}

// ── Priority Scoring ──────────────────────────────────────────────

function calculatePriorities(keywords: LocalKeyword[]): LocalKeyword[] {
  for (const kw of keywords) {
    let score = 0;

    // Search volume factor (0-30)
    if (kw.searchVolume !== null) {
      if (kw.searchVolume >= 500) score += 30;
      else if (kw.searchVolume >= 200) score += 22;
      else if (kw.searchVolume >= 100) score += 15;
      else if (kw.searchVolume >= 50) score += 10;
      else if (kw.searchVolume >= 20) score += 5;
      else score += 2;
    }

    // Intent factor (0-25): transactional > commercial > informational > navigational
    const intentScores: Record<KeywordIntent, number> = {
      transactional: 25,
      commercial_investigation: 20,
      informational: 12,
      navigational: 8,
    };
    score += intentScores[kw.intent] || 10;

    // Local relevance factor (0-20)
    score += Math.round((kw.localRelevance / 100) * 20);

    // CPC factor (0-10): higher CPC = more commercial value
    if (kw.cpc !== null) {
      if (kw.cpc >= 20) score += 10;
      else if (kw.cpc >= 10) score += 7;
      else if (kw.cpc >= 5) score += 5;
      else if (kw.cpc >= 2) score += 3;
      else score += 1;
    }

    // Difficulty penalty (0--10): easier is better
    const diffPenalty: Record<KeywordDifficulty, number> = {
      easy: 0,
      medium: -3,
      hard: -7,
      very_hard: -10,
    };
    score += diffPenalty[kw.difficulty || "medium"] || -3;

    // SERP feature bonus: local pack presence = high value
    if (kw.serpFeatures.some((f) => f.type === "local_pack" && f.present)) {
      score += 5;
    }

    kw.priority = Math.max(0, Math.min(100, score));
  }

  return keywords.sort((a, b) => b.priority - a.priority);
}

// ── Intent Classification Helper ──────────────────────────────────

function classifyIntent(term: string): KeywordIntent {
  for (const { pattern, intent } of INTENT_PATTERNS) {
    if (pattern.test(term)) return intent;
  }
  return "informational";
}
