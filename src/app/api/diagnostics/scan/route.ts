import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
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
    return { ok: false, description: "Google API credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) not configured" };
  }
  return { ok: true, description: "Google API credentials present" };
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
        `${prob.name}: ${prob.issue}. Fix in Vercel environment variables.`);
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

    // 5. Google API config
    const googleCheck = await checkGoogleApiConfig();
    if (!googleCheck.ok) {
      const id = await logIssue(supabase, "google_api_config", "medium", googleCheck.description);
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
