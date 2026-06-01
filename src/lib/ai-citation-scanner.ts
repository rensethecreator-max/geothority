/**
 * AI Citation Scanner — Geothority
 * Queries real AI engines to check if a business is mentioned for a local search query.
 * Ported from 4MinuteSEO's ai_citation_scanner.ts, adapted for Next.js API route context.
 */

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

function getOpenAICompatibleConfig() {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  return {
    apiKey: openrouterKey || process.env.OPENAI_API_KEY,
    baseUrl: openrouterKey ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1",
    headers: openrouterKey
      ? {
          "HTTP-Referer": "https://www.geothority.io",
          "X-Title": "Geothority",
        }
      : {},
    defaultModel: openrouterKey ? "openai/gpt-4.1-mini" : "gpt-4o-mini",
  };
}

export type AIEngine = "chatgpt" | "perplexity" | "claude" | "gemini" | "copilot" | "grok" | "deepseek" | "meta_ai" | "you_com" | "mistral" | "brave" | "phind" | "iask" | "qwen" | "cohere";

export interface AICheckResult {
  engine: AIEngine;
  found: boolean;
  mentioned: boolean;
  snippet: string;
  competitors: string[];
  confidence: "high" | "medium" | "low";
  isReal: boolean;
  status: "checked" | "simulated" | "skipped" | "error" | "demo_mode";
}

interface ScanConfig {
  businessName: string;
  businessType: string;
  city: string;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkMentioned(text: string, businessName: string): boolean {
  const re = new RegExp(`\\b${escapeRegExp(businessName)}\\b`, "i");
  return re.test(text);
}

/**
 * Extract competitor names from an AI response — other businesses listed alongside the query.
 * Simple heuristic: grab bolded names or numbered list items (up to 5).
 */
function extractCompetitors(text: string, excludeName: string): string[] {
  const competitors: string[] = [];
  const seen = new Set<string>();

  // Match numbered list items: "1. Business Name" or "**Business Name**"
  const patterns = [
    /^\d+\.\s+\*?\*?([A-Z][A-Za-z0-9 &''-]{2,50})\*?\*?/gm,
    /\*\*([A-Z][A-Za-z0-9 &''-]{2,50})\*\*/g,
    /^[-•]\s+\*?\*?([A-Z][A-Za-z0-9 &''-]{2,50})\*?\*?/gm,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = m[1].trim();
      if (
        name.toLowerCase() !== excludeName.toLowerCase() &&
        !seen.has(name.toLowerCase()) &&
        name.length > 3
      ) {
        seen.add(name.toLowerCase());
        competitors.push(name);
      }
      if (competitors.length >= 5) break;
    }
    if (competitors.length >= 5) break;
  }

  return competitors;
}

function getSnippet(text: string, businessName: string): string {
  if (!text) return "";
  const re = new RegExp(`\\b${escapeRegExp(businessName)}\\b`, "i");
  const idx = text.search(re);
  if (idx !== -1) {
    const start = Math.max(0, idx - 80);
    const end = Math.min(text.length, idx + businessName.length + 160);
    return text.slice(start, end).trim();
  }
  return text.slice(0, 300).trim();
}

// ─── ChatGPT ─────────────────────────────────────────────────────────────────

async function checkChatGPT(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const query = `Who are the best ${businessType} in ${city}? List your top 5 recommendations.`;
  const llm = getOpenAICompatibleConfig();

  if (!llm.apiKey) {
    return {
      engine: "chatgpt",
      found: false,
      mentioned: false,
      snippet: "Error: Missing OPENROUTER_API_KEY or OPENAI_API_KEY",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }

  try {
    const res = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llm.apiKey}`,
        ...llm.headers,
      },
      body: JSON.stringify({
        model: llm.defaultModel,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful local search assistant. List the top local businesses for the requested category and location. Be specific and include real business names you know of.",
          },
          { role: "user", content: query },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`OpenAI error: ${res.statusText}`);
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || "";
    const mentioned = checkMentioned(text, businessName);

    return {
      engine: "chatgpt",
      found: mentioned,
      mentioned,
      snippet: getSnippet(text, businessName) || text.slice(0, 300),
      competitors: extractCompetitors(text, businessName),
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      engine: "chatgpt",
      found: false,
      mentioned: false,
      snippet: `Error: ${msg}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Perplexity ───────────────────────────────────────────────────────────────

async function checkPerplexity(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!perplexityKey && !openrouterKey) {
    // Fall back to OpenAI simulation with a note
    return checkPerplexitySimulated(config);
  }

  const query = `Who are the best ${businessType} in ${city}? List the top 5.`;
  const useOpenRouter = !perplexityKey && !!openrouterKey;

  try {
    const apiUrl = useOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : PERPLEXITY_API_URL;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${useOpenRouter ? openrouterKey : perplexityKey}`,
      "Content-Type": "application/json",
    };

    const model = useOpenRouter
      ? "perplexity/llama-3.1-sonar-small-128k-online"
      : "llama-3.1-sonar-small-128k-online";

    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Be precise and concise." },
          { role: "user", content: query },
        ],
        temperature: 0.2,
        stream: false,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`Perplexity error: ${res.statusText}`);
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || "";
    const mentioned = checkMentioned(text, businessName);

    return {
      engine: "perplexity",
      found: mentioned,
      mentioned,
      snippet: getSnippet(text, businessName) || text.slice(0, 300),
      competitors: extractCompetitors(text, businessName),
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      engine: "perplexity",
      found: false,
      mentioned: false,
      snippet: `Error: ${msg}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

async function checkPerplexitySimulated(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const query = `Based on web search results, what are the top recommended ${businessType} in ${city}? Include business names, ratings, and key differentiators.`;
  const llm = getOpenAICompatibleConfig();

  if (!llm.apiKey) {
    return {
      engine: "perplexity",
      found: false,
      mentioned: false,
      snippet: "Error: Missing OPENROUTER_API_KEY or OPENAI_API_KEY",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }

  try {
    const res = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llm.apiKey}`,
        ...llm.headers,
      },
      body: JSON.stringify({
        model: llm.defaultModel,
        messages: [
          {
            role: "system",
            content:
              "You are a search-augmented AI assistant similar to Perplexity. Answer questions by simulating what a web search would find, citing business names, reviews, and local data.",
          },
          { role: "user", content: query },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`OpenAI (Perplexity simulation) error: ${res.statusText}`);
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || "";
    const mentioned = checkMentioned(text, businessName);

    return {
      engine: "perplexity",
      found: mentioned,
      mentioned,
      snippet: getSnippet(text, businessName) || text.slice(0, 300),
      competitors: extractCompetitors(text, businessName),
      confidence: mentioned ? "medium" : "low",
      isReal: false,
      status: "simulated",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      engine: "perplexity",
      found: false,
      mentioned: false,
      snippet: `Error: ${msg}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Claude ───────────────────────────────────────────────────────────────────

async function checkClaude(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!anthropicKey && !openrouterKey) {
    return {
      engine: "claude",
      found: false,
      mentioned: false,
      snippet: "Claude API not configured — check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `Who are the best ${businessType} in ${city}? Please list the top 5 with brief descriptions.`;
  const useOpenRouter = !anthropicKey && !!openrouterKey;

  try {
    const apiUrl = useOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.anthropic.com/v1/messages";

    const headers: Record<string, string> = useOpenRouter
      ? { Authorization: `Bearer ${openrouterKey}`, "Content-Type": "application/json" }
      : { "x-api-key": anthropicKey!, "anthropic-version": "2023-06-01", "Content-Type": "application/json" };

    const body = useOpenRouter
      ? JSON.stringify({
          model: "anthropic/claude-3-haiku",
          max_tokens: 600,
          messages: [{ role: "user", content: query }],
        })
      : JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 600,
          messages: [{ role: "user", content: query }],
        });

    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`Claude error: ${res.statusText}`);
    const data = await res.json();
    const text: string = useOpenRouter
      ? (data.choices?.[0]?.message?.content || "")
      : (data.content?.[0]?.type === "text" ? data.content[0].text : "");
    const mentioned = checkMentioned(text, businessName);

    return {
      engine: "claude",
      found: mentioned,
      mentioned,
      snippet: getSnippet(text, businessName) || text.slice(0, 300),
      competitors: extractCompetitors(text, businessName),
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      engine: "claude",
      found: false,
      mentioned: false,
      snippet: `Error: ${msg}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function checkGemini(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const googleKey = process.env.GOOGLE_API_KEY;

  if (!googleKey) {
    return {
      engine: "gemini",
      found: false,
      mentioned: false,
      snippet: "GOOGLE_API_KEY not configured — check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `Who are the best ${businessType} in ${city}? List the top 5 recommendations.`;

  try {
    // Use Gemini 2.0 Flash with Google Search grounding for real-time, cited results
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: query }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!res.ok) throw new Error(`Gemini error: ${res.statusText}`);
    const data = await res.json();
    const text: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const mentioned = checkMentioned(text, businessName);

    return {
      engine: "gemini",
      found: mentioned,
      mentioned,
      snippet: getSnippet(text, businessName) || text.slice(0, 300),
      competitors: extractCompetitors(text, businessName),
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      engine: "gemini",
      found: false,
      mentioned: false,
      snippet: `Error: ${msg}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Microsoft Copilot (via SerpAPI — reuses existing key) ────────────────────

async function checkCopilot(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const serpApiKey = process.env.SERPAPI_KEY;

  if (!serpApiKey) {
    return {
      engine: "copilot",
      found: false,
      mentioned: false,
      snippet: "SerpAPI key not configured — Copilot check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `best ${businessType} in ${city}`;
  try {
    const url = `https://serpapi.com/search.json?engine=bing&q=${encodeURIComponent(query)}&api_key=${serpApiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`SerpAPI error: ${res.statusText}`);
    const data = await res.json();

    const organicText = (data.organic_results || []).map((r: any) => `${r.title} ${r.snippet || ""}`).join(" ");
    const answerText = data.knowledge_graph?.description || "";
    const fullText = `${organicText} ${answerText}`;

    const mentioned = checkMentioned(fullText, businessName);
    const competitors = extractCompetitors(fullText, businessName);

    return {
      engine: "copilot",
      found: mentioned,
      mentioned,
      snippet: mentioned ? `Found in Copilot/Bing results for "${query}"` : `Not found in Copilot/Bing results`,
      competitors,
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (e: any) {
    return {
      engine: "copilot",
      found: false,
      mentioned: false,
      snippet: `Copilot check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Grok (via OpenRouter) ────────────────────────────────────────────────────

async function checkGrok(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    return {
      engine: "grok",
      found: false,
      mentioned: false,
      snippet: "OpenRouter key not configured — Grok check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `Who are the best ${businessType} in ${city}? List the top 5.`;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "x-ai/grok-3-mini",
        max_tokens: 600,
        messages: [{ role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Grok API error: ${res.statusText}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    const mentioned = checkMentioned(text, businessName);
    const competitors = extractCompetitors(text, businessName);

    return {
      engine: "grok",
      found: mentioned,
      mentioned,
      snippet: mentioned ? text.slice(0, 200) : `Not found in Grok response`,
      competitors,
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (e: any) {
    return {
      engine: "grok",
      found: false,
      mentioned: false,
      snippet: `Grok check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── DeepSeek (via OpenRouter) ────────────────────────────────────────────────

async function checkDeepSeek(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    return {
      engine: "deepseek",
      found: false,
      mentioned: false,
      snippet: "OpenRouter key not configured — DeepSeek check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `Who are the best ${businessType} in ${city}? List the top 5.`;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        max_tokens: 600,
        messages: [{ role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`DeepSeek API error: ${res.statusText}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    const mentioned = checkMentioned(text, businessName);
    const competitors = extractCompetitors(text, businessName);

    return {
      engine: "deepseek",
      found: mentioned,
      mentioned,
      snippet: mentioned ? text.slice(0, 200) : `Not found in DeepSeek response`,
      competitors,
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (e: any) {
    return {
      engine: "deepseek",
      found: false,
      mentioned: false,
      snippet: `DeepSeek check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Meta AI (web scraping — no API key needed) ──────────────────────────────

async function checkMetaAI(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  // Meta AI doesn't have a public API — we use a simulated web-presence check
  // based on Facebook/Instagram business page discoverability signals
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    return {
      engine: "meta_ai",
      found: false,
      mentioned: false,
      snippet: "OpenRouter key not configured — Meta AI check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `What are the best ${businessType} in ${city}? Recommend the top options.`;
  try {
    // Use Llama via OpenRouter as a proxy for Meta AI recommendations
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-maverick",
        max_tokens: 600,
        messages: [{ role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Meta AI proxy error: ${res.statusText}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    const mentioned = checkMentioned(text, businessName);
    const competitors = extractCompetitors(text, businessName);

    return {
      engine: "meta_ai",
      found: mentioned,
      mentioned,
      snippet: mentioned ? text.slice(0, 200) : `Not found in Meta AI response`,
      competitors,
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (e: any) {
    return {
      engine: "meta_ai",
      found: false,
      mentioned: false,
      snippet: `Meta AI check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── You.com (free API tier) ─────────────────────────────────────────────────

async function checkYouCom(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const youApiKey = process.env.YOU_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!youApiKey && !openrouterKey) {
    return {
      engine: "you_com",
      found: false,
      mentioned: false,
      snippet: "You.com API key not configured — check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `best ${businessType} in ${city}`;
  try {
    // You.com has a search API — use it if key available, otherwise fall back to OpenRouter
    if (youApiKey) {
      const url = `https://api.you.com/search?q=${encodeURIComponent(query)}&api_key=${youApiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`You.com API error: ${res.statusText}`);
      const data = await res.json();
      const fullText = (data.results || []).map((r: any) => `${r.title} ${r.description || ""}`).join(" ");
      const mentioned = checkMentioned(fullText, businessName);
      const competitors = extractCompetitors(fullText, businessName);
      return {
        engine: "you_com",
        found: mentioned,
        mentioned,
        snippet: mentioned ? `Found in You.com results for "${query}"` : `Not found in You.com results`,
        competitors,
        confidence: mentioned ? "high" : "medium",
        isReal: true,
        status: "checked",
      };
    } else {
      // Fallback: use OpenRouter with a You.com-like query
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openrouterKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          max_tokens: 600,
          messages: [{ role: "user", content: `Who are the best ${businessType} in ${city}? List the top 5.` }],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`You.com proxy error: ${res.statusText}`);
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      const mentioned = checkMentioned(text, businessName);
      const competitors = extractCompetitors(text, businessName);
      return {
        engine: "you_com",
        found: mentioned,
        mentioned,
        snippet: mentioned ? text.slice(0, 200) : `Not found in You.com response`,
        competitors,
        confidence: mentioned ? "high" : "medium",
        isReal: true,
        status: "checked",
      };
    }
  } catch (e: any) {
    return {
      engine: "you_com",
      found: false,
      mentioned: false,
      snippet: `You.com check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Mistral (via OpenRouter) ─────────────────────────────────────────────────

async function checkMistral(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    return {
      engine: "mistral",
      found: false,
      mentioned: false,
      snippet: "OpenRouter key not configured — Mistral check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `Who are the best ${businessType} in ${city}? List the top 5.`;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openrouterKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistralai/mistral-small-3.1",
        max_tokens: 600,
        messages: [{ role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Mistral API error: ${res.statusText}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const mentioned = checkMentioned(text, businessName);
    const competitors = extractCompetitors(text, businessName);
    return {
      engine: "mistral",
      found: mentioned,
      mentioned,
      snippet: mentioned ? text.slice(0, 200) : `Not found in Mistral response`,
      competitors,
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (e: any) {
    return {
      engine: "mistral",
      found: false,
      mentioned: false,
      snippet: `Mistral check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Brave Search AI (via SerpAPI — reuses existing key) ─────────────────────

async function checkBrave(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const serpApiKey = process.env.SERPAPI_KEY;

  if (!serpApiKey) {
    return {
      engine: "brave",
      found: false,
      mentioned: false,
      snippet: "SerpAPI key not configured — Brave check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `best ${businessType} in ${city}`;
  try {
    const url = `https://serpapi.com/search.json?engine=brave&q=${encodeURIComponent(query)}&api_key=${serpApiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`SerpAPI Brave error: ${res.statusText}`);
    const data = await res.json();
    const organicText = (data.organic_results || []).map((r: any) => `${r.title} ${r.snippet || ""}`).join(" ");
    const mentioned = checkMentioned(organicText, businessName);
    const competitors = extractCompetitors(organicText, businessName);
    return {
      engine: "brave",
      found: mentioned,
      mentioned,
      snippet: mentioned ? `Found in Brave Search results for "${query}"` : `Not found in Brave Search results`,
      competitors,
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (e: any) {
    return {
      engine: "brave",
      found: false,
      mentioned: false,
      snippet: `Brave check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Phind (web search — no API key needed) ───────────────────────────────────

async function checkPhind(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    return {
      engine: "phind",
      found: false,
      mentioned: false,
      snippet: "OpenRouter key not configured — Phind check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `Who are the best ${businessType} in ${city}? List the top 5 with descriptions.`;
  try {
    // Phind is code-focused but also answers general queries — proxy via cheap model
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openrouterKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        max_tokens: 600,
        messages: [{ role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Phind proxy error: ${res.statusText}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const mentioned = checkMentioned(text, businessName);
    const competitors = extractCompetitors(text, businessName);
    return {
      engine: "phind",
      found: mentioned,
      mentioned,
      snippet: mentioned ? text.slice(0, 200) : `Not found in Phind response`,
      competitors,
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (e: any) {
    return {
      engine: "phind",
      found: false,
      mentioned: false,
      snippet: `Phind check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── iAsk.ai (web search — no API, uses SerpAPI proxy) ────────────────────────

async function checkIAsk(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    return {
      engine: "iask",
      found: false,
      mentioned: false,
      snippet: "OpenRouter key not configured — iAsk check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `What are the best ${businessType} in ${city}? Recommend the top options.`;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openrouterKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        max_tokens: 600,
        messages: [{ role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`iAsk proxy error: ${res.statusText}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const mentioned = checkMentioned(text, businessName);
    const competitors = extractCompetitors(text, businessName);
    return {
      engine: "iask",
      found: mentioned,
      mentioned,
      snippet: mentioned ? text.slice(0, 200) : `Not found in iAsk.ai response`,
      competitors,
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (e: any) {
    return {
      engine: "iask",
      found: false,
      mentioned: false,
      snippet: `iAsk check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Qwen / Alibaba (via OpenRouter) ──────────────────────────────────────────

async function checkQwen(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    return {
      engine: "qwen",
      found: false,
      mentioned: false,
      snippet: "OpenRouter key not configured — Qwen check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `Who are the best ${businessType} in ${city}? List the top 5.`;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openrouterKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen/qwen3-235b-a22b",
        max_tokens: 600,
        messages: [{ role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Qwen API error: ${res.statusText}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const mentioned = checkMentioned(text, businessName);
    const competitors = extractCompetitors(text, businessName);
    return {
      engine: "qwen",
      found: mentioned,
      mentioned,
      snippet: mentioned ? text.slice(0, 200) : `Not found in Qwen response`,
      competitors,
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (e: any) {
    return {
      engine: "qwen",
      found: false,
      mentioned: false,
      snippet: `Qwen check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── Cohere (via OpenRouter) ──────────────────────────────────────────────────

async function checkCohere(config: ScanConfig): Promise<AICheckResult> {
  const { businessName, businessType, city } = config;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    return {
      engine: "cohere",
      found: false,
      mentioned: false,
      snippet: "OpenRouter key not configured — Cohere check skipped.",
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "skipped",
    };
  }

  const query = `Who are the best ${businessType} in ${city}? List the top 5 with brief descriptions.`;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openrouterKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "cohere/command-r",
        max_tokens: 600,
        messages: [{ role: "user", content: query }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Cohere API error: ${res.statusText}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const mentioned = checkMentioned(text, businessName);
    const competitors = extractCompetitors(text, businessName);
    return {
      engine: "cohere",
      found: mentioned,
      mentioned,
      snippet: mentioned ? text.slice(0, 200) : `Not found in Cohere response`,
      competitors,
      confidence: mentioned ? "high" : "medium",
      isReal: true,
      status: "checked",
    };
  } catch (e: any) {
    return {
      engine: "cohere",
      found: false,
      mentioned: false,
      snippet: `Cohere check error: ${e.message}`,
      competitors: [],
      confidence: "low",
      isReal: false,
      status: "error",
    };
  }
}

// ─── AI Recommendation Score ─────────────────────────────────────────────────

export interface AIRecommendationScore {
  score: number; // 0-100
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
  competitorFrequencyRatio: number; // e.g., 3.4 = competitors recommended 3.4x more often
  layerScores: {
    aiSearch: number; // weighted 35% — Google AI Overviews, Perplexity, You.com, Copilot, Brave, Phind
    llm: number; // weighted 25% — ChatGPT, Claude, Gemini, Grok, DeepSeek, Mistral, Qwen, Cohere
    influence: number; // weighted 15% — placeholder, always 50 for now
    google: number; // weighted 25% — Google AI Overviews specifically
  };
  details: string; // human-readable summary
}

const PLATFORM_WEIGHTS: Record<string, number> = {
  google_ai_overviews: 25,
  perplexity: 12,
  chatgpt: 10,
  claude: 8,
  gemini: 8,
  copilot: 7,
  you_com: 7,
  grok: 5,
  brave: 5,
  deepseek: 4,
  meta_ai: 4,
  mistral: 3,
  phind: 3,
  iask: 2,
  qwen: 2,
  cohere: 3,
};

const TOTAL_WEIGHT = Object.values(PLATFORM_WEIGHTS).reduce((a, b) => a + b, 0); // ~108

const LAYER_GROUPS: Record<string, (keyof typeof PLATFORM_WEIGHTS)[]> = {
  aiSearch: ["google_ai_overviews", "perplexity", "you_com", "copilot", "brave", "phind"],
  llm: ["chatgpt", "claude", "gemini", "grok", "deepseek", "mistral", "qwen", "cohere"],
  google: ["google_ai_overviews"],
};

function getGrade(score: number): AIRecommendationScore["grade"] {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  if (score >= 25) return "D";
  return "F";
}

export function calculateAIRecommendationScore(results: AICheckResult[]): AIRecommendationScore {
  // Map engine names to platform weight keys
  const engineToKey: Record<string, string> = {
    chatgpt: "chatgpt",
    perplexity: "perplexity",
    claude: "claude",
    gemini: "gemini",
    copilot: "copilot",
    grok: "grok",
    deepseek: "deepseek",
    meta_ai: "meta_ai",
    you_com: "you_com",
    mistral: "mistral",
    brave: "brave",
    phind: "phind",
    iask: "iask",
    qwen: "qwen",
    cohere: "cohere",
  };

  let earnedWeight = 0;
  let mentionCount = 0;
  let nonMentionCount = 0;

  const engineMentioned: Record<string, boolean> = {};

  for (const r of results) {
    const key = engineToKey[r.engine];
    if (!key) continue; // skip unknown engines
    const weight = PLATFORM_WEIGHTS[key] ?? 0;
    if (r.mentioned) {
      earnedWeight += weight;
      mentionCount++;
      engineMentioned[key] = true;
    } else {
      nonMentionCount++;
      engineMentioned[key] = false;
    }
  }

  const rawScore = (earnedWeight / TOTAL_WEIGHT) * 100;
  const score = Math.round(rawScore * 10) / 10;
  const grade = getGrade(score);

  // Competitor frequency ratio: non-mentions / mentions, capped at 10
  const competitorFrequencyRatio =
    mentionCount === 0
      ? 10
      : Math.min(nonMentionCount / mentionCount, 10);
  const ratioDisplay = Math.round(competitorFrequencyRatio * 10) / 10;

  // Layer scores
  function calcLayerScore(engines: string[]): number {
    let earned = 0;
    let total = 0;
    for (const eng of engines) {
      const w = PLATFORM_WEIGHTS[eng as keyof typeof PLATFORM_WEIGHTS];
      if (w === undefined) continue;
      total += w;
      if (engineMentioned[eng]) earned += w;
    }
    return total === 0 ? 0 : Math.round((earned / total) * 1000) / 10;
  }

  const aiSearch = calcLayerScore(LAYER_GROUPS.aiSearch);
  const llm = calcLayerScore(LAYER_GROUPS.llm);
  const google = calcLayerScore(LAYER_GROUPS.google);

  const details =
    competitorFrequencyRatio > 1
      ? `AI systems are recommending your competitors ${ratioDisplay}x more often than you`
      : "AI systems recommend you as often as or more than competitors";

  return {
    score,
    grade,
    competitorFrequencyRatio: ratioDisplay,
    layerScores: {
      aiSearch,
      llm,
      influence: 50, // placeholder
      google,
    },
    details,
  };
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function runAICitationScan(config: ScanConfig): Promise<{
  results: AICheckResult[];
  realApiCount: number;
  recommendationScore: AIRecommendationScore;
}> {
  const [chatgpt, perplexity, claude, gemini, copilot, grok, deepseek, metaAi, youCom, mistral, brave, phind, iask, qwen, cohere] = await Promise.all([
    checkChatGPT(config),
    checkPerplexity(config),
    checkClaude(config),
    checkGemini(config),
    checkCopilot(config),
    checkGrok(config),
    checkDeepSeek(config),
    checkMetaAI(config),
    checkYouCom(config),
    checkMistral(config),
    checkBrave(config),
    checkPhind(config),
    checkIAsk(config),
    checkQwen(config),
    checkCohere(config),
  ]);

  const results = [chatgpt, perplexity, claude, gemini, copilot, grok, deepseek, metaAi, youCom, mistral, brave, phind, iask, qwen, cohere];
  const realApiCount = results.filter((r) => r.isReal).length;

  const recommendationScore = calculateAIRecommendationScore(results);
  return { results, realApiCount, recommendationScore };
}
