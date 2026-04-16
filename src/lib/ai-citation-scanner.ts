/**
 * AI Citation Scanner — Geothority
 * Queries real AI engines to check if a business is mentioned for a local search query.
 * Ported from 4MinuteSEO's ai_citation_scanner.ts, adapted for Next.js API route context.
 */

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

export type AIEngine = "chatgpt" | "perplexity" | "claude" | "gemini";

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

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: query }] }],
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

// ─── Public export ────────────────────────────────────────────────────────────

export async function runAICitationScan(config: ScanConfig): Promise<{
  results: AICheckResult[];
  realApiCount: number;
}> {
  const [chatgpt, perplexity, claude, gemini] = await Promise.all([
    checkChatGPT(config),
    checkPerplexity(config),
    checkClaude(config),
    checkGemini(config),
  ]);

  const results = [chatgpt, perplexity, claude, gemini];
  const realApiCount = results.filter((r) => r.isReal).length;

  return { results, realApiCount };
}
