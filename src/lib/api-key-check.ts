/**
 * API Key Configuration Check
 * Returns the status of all API keys needed for Geothority features.
 * Used by diagnostics, health checks, and setup UI.
 */

export interface KeyStatus {
  key: string;
  envVar: string;
  configured: boolean;
  required: boolean;
  impact: string;
  category: "critical" | "recommended" | "optional";
}

type KeyDef = Omit<KeyStatus, "configured"> & {
  envVars?: string[];
  isConfigured?: () => boolean;
};

const KEY_DEFS: KeyDef[] = [
  // Critical — features are broken without these
  {
    key: "OpenAI",
    envVar: "OPENAI_API_KEY",
    required: true,
    impact: "AI Overview, content generation, schema recommendations, chat assistant",
    category: "critical",
  },
  {
    key: "Google Maps",
    envVar: "GOOGLE_MAPS_API_KEY",
    required: true,
    impact: "Real competitor data, GBP connection, location services",
    category: "critical",
  },
  {
    key: "Foursquare",
    envVar: "FOURSQUARE_API_KEY",
    envVars: ["FOURSQUARE_API_KEY", "FOURSQUARE_CLIENT_ID", "FOURSQUARE_CLIENT_SECRET"],
    isConfigured: () => !!process.env.FOURSQUARE_API_KEY || !!(process.env.FOURSQUARE_CLIENT_ID && process.env.FOURSQUARE_CLIENT_SECRET),
    required: true,
    impact: "Foursquare network lookup and listing distribution coverage across 50+ downstream directories",
    category: "critical",
  },
  {
    key: "Supabase URL",
    envVar: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    impact: "Database, auth, and all data persistence",
    category: "critical",
  },
  {
    key: "Supabase Anon Key",
    envVar: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    impact: "Client-side database access",
    category: "critical",
  },
  {
    key: "Supabase Service Role Key",
    envVar: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    impact: "Server-side database access, cron jobs, billing webhooks, monitoring automation",
    category: "critical",
  },
  // Recommended — features work but are degraded
  {
    key: "Perplexity",
    envVar: "PERPLEXITY_API_KEY",
    envVars: ["PERPLEXITY_API_KEY", "OPENROUTER_API_KEY"],
    isConfigured: () => !!process.env.PERPLEXITY_API_KEY || !!process.env.OPENROUTER_API_KEY,
    required: false,
    impact: "Real Perplexity AI Overview results (falls back to OpenRouter, then OpenAI simulation)",
    category: "recommended",
  },
  {
    key: "Anthropic",
    envVar: "ANTHROPIC_API_KEY",
    envVars: ["ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"],
    isConfigured: () => !!process.env.ANTHROPIC_API_KEY || !!process.env.OPENROUTER_API_KEY,
    required: false,
    impact: "Real Claude AI Overview results (falls back to OpenRouter when direct Anthropic creds are absent)",
    category: "recommended",
  },
  {
    key: "Resend",
    envVar: "RESEND_API_KEY",
    required: false,
    impact: "Email alerts, onboarding journey, notification emails",
    category: "recommended",
  },
  {
    key: "Stripe Secret",
    envVar: "STRIPE_SECRET_KEY",
    required: false,
    impact: "Paid subscriptions and billing",
    category: "recommended",
  },
  {
    key: "Google OAuth Runtime Credentials",
    envVar: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET",
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    isConfigured: () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    required: false,
    impact: "Server-side GBP token refresh and direct Google publish flows after Supabase OAuth is connected",
    category: "recommended",
  },
  // Optional — nice-to-have
  {
    key: "SerpAPI",
    envVar: "SERP_API_KEY",
    required: false,
    impact: "Real Google SERP data for AI Overview analysis",
    category: "optional",
  },
  {
    key: "Semrush",
    envVar: "SEMRUSH_API_KEY",
    required: false,
    impact: "Aggregator integration (sync to Semrush listings)",
    category: "optional",
  },
  {
    key: "Yext",
    envVar: "YEXT_API_KEY",
    required: false,
    impact: "Aggregator integration (sync to Yext listings)",
    category: "optional",
  },
  {
    key: "Vendasta",
    envVar: "VENDASTA_API_KEY",
    required: false,
    impact: "Aggregator integration (sync to Vendasta listings)",
    category: "optional",
  },
];

export function getApiKeyStatus(): KeyStatus[] {
  return KEY_DEFS.map((def) => ({
    ...def,
    configured: def.isConfigured ? def.isConfigured() : !!process.env[def.envVar],
  }));
}

export function getMinViableKeysConfigured(): boolean {
  const critical = KEY_DEFS.filter((d) => d.category === "critical");
  return critical.every((d) => (d.isConfigured ? d.isConfigured() : !!process.env[d.envVar]));
}

export function getKeysSummary(): {
  total: number;
  configured: number;
  criticalMissing: string[];
  recommendedMissing: string[];
} {
  const statuses = getApiKeyStatus();
  return {
    total: statuses.length,
    configured: statuses.filter((s) => s.configured).length,
    criticalMissing: statuses.filter((s) => !s.configured && s.category === "critical").map((s) => s.key),
    recommendedMissing: statuses.filter((s) => !s.configured && s.category === "recommended").map((s) => s.key),
  };
}
