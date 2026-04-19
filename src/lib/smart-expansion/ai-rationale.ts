// AI-Powered Rationale Generation — Phase 7 Enhancement
// Uses LLM to generate strategic, contextual rationale for expansion targets

export interface RationaleContext {
  targetName: string;
  targetType: "city" | "service" | "niche_directory";
  industry: string;
  currentCity: string;
  impactScore: number;
  signals: { type: string; value: number; source: string }[];
  competitorGaps: string[];
  businessName: string;
}

/**
 * Generate an AI-powered strategic rationale for an expansion target.
 * Falls back to template-based rationale if LLM is unavailable.
 */
export async function generateAIRationale(
  context: RationaleContext,
  openaiApiKey?: string
): Promise<string> {
  const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) return generateFallbackRationale(context);

  try {
    const signalSummary = context.signals
      .map((s) => `${s.type}: ${s.value} (${s.source})`)
      .join(", ");

    const prompt = `You are a local SEO strategist. Write a 2-3 sentence strategic rationale for why a ${context.industry} business in ${context.currentCity} should expand to this target. Be specific, actionable, and data-driven. No fluff.

Target: ${context.targetName} (${context.targetType})
Industry: ${context.industry}
Business: ${context.businessName}
Impact Score: ${context.impactScore}/100
Signals: ${signalSummary}
Competitor Gaps: ${context.competitorGaps.join("; ") || "None identified"}

Rationale:`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const rationale = data.choices?.[0]?.message?.content?.trim();
    if (rationale && rationale.length > 20) return rationale;
  } catch (e) {
    console.warn("[SmartExpansion] AI rationale fallback:", (e as Error).message);
  }

  return generateFallbackRationale(context);
}

function generateFallbackRationale(context: RationaleContext): string {
  const { targetName, targetType, industry, impactScore, signals, competitorGaps } = context;

  if (targetType === "city") {
    const pop = signals.find((s) => s.type === "population_density")?.value;
    const prox = signals.find((s) => s.type === "proximity_to_existing")?.value;
    const parts: string[] = [];
    if (pop && pop > 100000) parts.push(`${targetName} has a population of ${pop.toLocaleString()} offering substantial search volume`);
    else if (pop && pop > 50000) parts.push(`${targetName}'s mid-size population creates a solid local market`);
    else parts.push(`${targetName} is an underserved market with lower competition`);
    if (prox && prox < 30) parts.push(`at only ${Math.round(prox)} miles from your base, service delivery is straightforward`);
    if (competitorGaps.length > 0) parts.push(`${competitorGaps.length} competitor gap(s) identified — first-mover opportunity`);
    parts.push(`impact score: ${impactScore}/100`);
    return parts.join(". ") + ".";
  }

  if (targetType === "service") {
    const sv = signals.find((s) => s.type === "search_volume")?.value;
    const parts: string[] = [];
    parts.push(`"${targetName}" is a high-adjacency service in the ${industry} vertical`);
    if (sv && sv > 2000) parts.push(`with ${sv.toLocaleString()} monthly searches indicating strong demand`);
    if (competitorGaps.length > 0) parts.push("competitors aren't targeting this — differentiation opportunity");
    parts.push(`impact score: ${impactScore}/100`);
    return parts.join(", ") + ".";
  }

  // niche_directory
  const da = signals.find((s) => s.type === "directory_authority")?.value;
  const parts: string[] = [];
  parts.push(`${targetName} is a relevant directory${da ? ` with DA ${da}` : ""} for the ${industry} industry`);
  if (competitorGaps.includes("low_competitor_listing_rate")) parts.push("few competitors are listed — strong differentiator");
  else parts.push("listing maintains parity with competitors");
  parts.push(`impact score: ${impactScore}/100`);
  return parts.join(". ") + ".";
}
