import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const REQUIRED_ENV_ALTERNATIVES: Array<{ names: string[]; label: string }> = [
  { names: ["OPENROUTER_API_KEY", "OPENAI_API_KEY"], label: "OPENROUTER_API_KEY or OPENAI_API_KEY" },
];

const REQUIRED_TABLES = [
  "user_profiles",
  "scans",
  "generated_content",
  "competitors",
  "notifications",
  "support_conversations",
];

function checkEnvVarIntegrity(): Array<{ name: string; issue: string }> {
  const problems: Array<{ name: string; issue: string }> = [];
  for (const varName of REQUIRED_ENV_VARS) {
    const val = process.env[varName];
    if (!val) {
      problems.push({ name: varName, issue: "missing" });
    } else if (/[\r\n]/.test(val)) {
      problems.push({ name: varName, issue: "contains newline characters" });
    } else if (val !== val.trim()) {
      problems.push({ name: varName, issue: "has leading/trailing whitespace" });
    }
  }
  for (const alternative of REQUIRED_ENV_ALTERNATIVES) {
    const values = alternative.names
      .map((name) => ({ name, value: process.env[name] }))
      .filter((entry) => !!entry.value);
    if (values.length === 0) {
      problems.push({ name: alternative.label, issue: "missing" });
      continue;
    }
    for (const entry of values) {
      if (/[\r\n]/.test(entry.value!)) {
        problems.push({ name: entry.name, issue: "contains newline characters" });
      } else if (entry.value !== entry.value!.trim()) {
        problems.push({ name: entry.name, issue: "has leading/trailing whitespace" });
      }
    }
  }
  return problems;
}

function checkStripeWebhookSecret(): { ok: boolean; description: string } {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret) return { ok: false, description: "STRIPE_WEBHOOK_SECRET is missing" };
  if (!secret.startsWith("whsec_")) {
    return { ok: false, description: "STRIPE_WEBHOOK_SECRET does not start with 'whsec_'" };
  }
  if (secret.length < 32) return { ok: false, description: "STRIPE_WEBHOOK_SECRET appears too short" };
  return { ok: true, description: "Stripe webhook secret looks valid" };
}

function checkStripeAnnualConfig(): { ok: boolean; description: string } {
  const annualVars = [
    "NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_AUTHORITY_ANNUAL_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL_PRICE_ID",
  ];

  const missing = annualVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    return {
      ok: false,
      description: `Annual billing is marketed in-app, but these Stripe annual price IDs are missing: ${missing.join(", ")}`,
    };
  }

  return { ok: true, description: "Annual Stripe price IDs are configured" };
}

function checkFoursquareConfig(): { ok: boolean; description: string } {
  const hasApiKey = !!process.env.FOURSQUARE_API_KEY;
  const hasLegacyPair = !!process.env.FOURSQUARE_CLIENT_ID && !!process.env.FOURSQUARE_CLIENT_SECRET;

  if (!hasApiKey && !hasLegacyPair) {
    return {
      ok: false,
      description: "Foursquare lookup is not configured. Add FOURSQUARE_API_KEY (preferred) or legacy FOURSQUARE_CLIENT_ID + FOURSQUARE_CLIENT_SECRET.",
    };
  }

  if (!hasApiKey && hasLegacyPair) {
    return {
      ok: true,
      description: "Foursquare is configured through legacy client credentials. Consider migrating to FOURSQUARE_API_KEY to match the rest of the app.",
    };
  }

  return { ok: true, description: "Foursquare API key is configured" };
}

async function checkTables(supabase: ReturnType<typeof createServiceClient>) {
  const results: Array<{ table: string; exists: boolean }> = [];
  for (const tableName of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(tableName).select("*").limit(1);
      results.push({ table: tableName, exists: !error });
    } catch {
      results.push({ table: tableName, exists: false });
    }
  }
  return results;
}

async function checkGoogleApiConfig(): Promise<{ ok: boolean; description: string }> {
  const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  if (!hasClientId || !hasClientSecret) {
    return {
      ok: false,
      description: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are missing. Supabase Google sign-in can still work, but server-side GBP token refresh and publish flows will fail.",
    };
  }
  return { ok: true, description: "Google runtime credentials present for server-side GBP refresh/publishing" };
}

async function logIssue(
  supabase: ReturnType<typeof createServiceClient>,
  issueType: string,
  severity: string,
  description: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("diagnostic_issues")
    .insert({ issue_type: issueType, severity, status: "detected", description })
    .select("id")
    .single();
  if (error) {
    console.error("[diagnostics] logIssue error:", error);
    return null;
  }
  return data?.id ?? null;
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const newIssues: string[] = [];

  try {
    // 1. DB connectivity (via service client)
    const { error: dbError } = await supabase.from("user_profiles").select("id").limit(1);
    if (dbError) {
      const id = await logIssue(supabase, "db_connectivity", "critical", `DB check failed: ${dbError.message}`);
      if (id) newIssues.push(id);
    }

    // 2. Env var integrity
    const envProblems = checkEnvVarIntegrity();
    for (const prob of envProblems) {
      const id = await logIssue(supabase, "env_var_integrity", "critical",
        `${prob.name}: ${prob.issue}. Fix in your production environment variables.`);
      if (id) newIssues.push(id);
    }

    // 3. Stripe webhook
    const stripeCheck = checkStripeWebhookSecret();
    if (!stripeCheck.ok) {
      const id = await logIssue(supabase, "stripe_webhook_secret", "high", stripeCheck.description);
      if (id) newIssues.push(id);
    }

    // 4. Required tables
    const tableChecks = await checkTables(supabase);
    for (const tc of tableChecks.filter((t) => !t.exists)) {
      const id = await logIssue(supabase, "missing_table", "critical",
        `Table '${tc.table}' does not exist. Run the SQL migration.`);
      if (id) newIssues.push(id);
    }

    // 5. Google runtime config
    const googleCheck = await checkGoogleApiConfig();
    if (!googleCheck.ok) {
      const id = await logIssue(supabase, "google_api_config", "medium", googleCheck.description);
      if (id) newIssues.push(id);
    }

    // 6. Foursquare config
    const foursquareCheck = checkFoursquareConfig();
    if (!foursquareCheck.ok) {
      const id = await logIssue(supabase, "foursquare_config", "medium", foursquareCheck.description);
      if (id) newIssues.push(id);
    }

    // 7. Annual Stripe pricing config
    const annualStripeCheck = checkStripeAnnualConfig();
    if (!annualStripeCheck.ok) {
      const id = await logIssue(supabase, "stripe_annual_config", "medium", annualStripeCheck.description);
      if (id) newIssues.push(id);
    }

    // Fetch all issues
    const { data: allIssues } = await supabase
      .from("diagnostic_issues")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ detected: newIssues.length, issues: allIssues ?? [] });
  } catch (err: any) {
    console.error("[diagnostics] scan error:", err);
    return NextResponse.json({ error: "Scan failed", details: err?.message }, { status: 500 });
  }
}
