import { createClient } from "@supabase/supabase-js";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function createAdminClient() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function isMissingOnboardingColumnError(error) {
  const message = error?.message || "";
  return /user_profiles\.onboarding_completed.*does not exist/i.test(message)
    || /Could not find the 'onboarding_completed' column of 'user_profiles' in the schema cache/i.test(message);
}

export function createFreshUserPayload() {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `ralis+e2e_${stamp}@example.com`,
    password: `GeoPass!${stamp.slice(-6)}`,
  };
}

export async function createFreshUser() {
  const admin = createAdminClient();
  const creds = createFreshUserPayload();

  const { data, error } = await admin.auth.admin.createUser({
    email: creds.email,
    password: creds.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message || "unknown error"}`);
  }

  const { error: profileError } = await admin.from("user_profiles").upsert(
    {
      id: data.user.id,
      plan: "free",
      onboarding_completed: false,
      business_name: null,
      city: null,
      state: null,
      website_url: null,
    },
    { onConflict: "id" },
  );

  if (profileError && !isMissingOnboardingColumnError(profileError)) {
    throw new Error(`Failed to seed user profile: ${profileError.message}`);
  }

  if (isMissingOnboardingColumnError(profileError)) {
    const { error: fallbackError } = await admin.from("user_profiles").upsert(
      {
        id: data.user.id,
        plan: "free",
        business_name: null,
        city: null,
        state: null,
        website_url: null,
      },
      { onConflict: "id" },
    );

    if (fallbackError) {
      throw new Error(`Failed to seed fallback user profile: ${fallbackError.message}`);
    }
  }

  return {
    admin,
    userId: data.user.id,
    email: creds.email,
    password: creds.password,
  };
}

export async function seedScan(admin, userId, overrides = {}) {
  const payload = {
    user_id: userId,
    url: "https://www.acme-insurance.example",
    business_name: "Acme Insurance Agency",
    city: "Austin",
    state: "TX",
    geothority_score: 62,
    geo_readiness_score: 59,
    layer_scores: {
      layer1: 54,
      layer2: 48,
      layer3: 66,
      layer4: 73,
      layer5: 70,
    },
    quick_wins: [
      {
        title: "Connect GBP",
        description: "Sync your Google Business Profile to strengthen local authority.",
        copyText: "Connect and sync your GBP profile.",
        impact: "high",
        layer: 1,
      },
      {
        title: "Publish trust page",
        description: "Add a trust page with licensing and service proof.",
        copyText: "Create a trust page with authority signals.",
        impact: "medium",
        layer: 2,
      },
    ],
    competitor_gaps: [],
    raw_scan_data: {
      businessName: "Acme Insurance Agency",
      city: "Austin",
      state: "TX",
      url: "https://www.acme-insurance.example",
    },
    ...overrides,
  };

  const { data, error } = await admin.from("scans").insert(payload).select("*").single();
  if (error || !data) {
    throw new Error(`Failed to seed scan: ${error?.message || "unknown error"}`);
  }
  return data;
}

export async function seedOperatorTimeline(admin, userId, scanId) {
  const runId = `oprun_e2e_${Date.now()}`;
  const createdAt = new Date().toISOString();

  const { error: runError } = await admin.from("operator_runs").insert({
    id: runId,
    user_id: userId,
    scan_id: scanId,
    status: "launched",
    operator_action: "auto_launch_fix_execution",
    message: "Operator launched the next recommended step from the latest scan.",
    redirect_to: "/action-center",
    metadata: {
      trigger: "e2e_seed",
      sourceScanId: scanId,
      chainDepth: 1,
    },
    current_stage: "execution_launch",
    stage_status: "completed",
    plan_id: null,
    completed_at: createdAt,
  });

  if (runError) {
    throw new Error(`Failed to seed operator run: ${runError.message}`);
  }

  const events = [
    {
      id: `${runId}_evt_1`,
      run_id: runId,
      user_id: userId,
      stage: "intake",
      status: "completed",
      title: "Operator intake complete",
      detail: "The operator loaded the latest scan and launch context.",
      metadata: {},
    },
    {
      id: `${runId}_evt_2`,
      run_id: runId,
      user_id: userId,
      stage: "activation_gate",
      status: "completed",
      title: "Activation gates passed",
      detail: "The user has enough live context to continue with execution.",
      metadata: {},
    },
    {
      id: `${runId}_evt_3`,
      run_id: runId,
      user_id: userId,
      stage: "execution_launch",
      status: "completed",
      title: "Execution launched",
      detail: "The operator launched the next action path from the scan diagnosis.",
      metadata: {},
    },
  ];

  const { error: eventError } = await admin.from("operator_run_events").insert(events);
  if (eventError) {
    throw new Error(`Failed to seed operator events: ${eventError.message}`);
  }

  return runId;
}

export async function markOnboardingComplete(admin, userId) {
  const { error } = await admin
    .from("user_profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId);

  if (error && !isMissingOnboardingColumnError(error)) {
    throw new Error(`Failed to mark onboarding complete: ${error.message}`);
  }
}

export async function cleanupUser(admin, userId) {
  const tables = [
    "operator_run_events",
    "operator_runs",
    "fix_execution_plans",
    "generated_content",
    "listing_syncs",
    "reputation_requests",
    "reputation_feedback_items",
    "reputation_proof_assets",
    "reputation_templates",
    "reputation_settings",
    "scans",
    "business_profiles",
    "user_profiles",
  ];

  for (const table of tables) {
    const userColumn = table === "user_profiles" ? "id" : "user_id";
    const { error } = await admin.from(table).delete().eq(userColumn, userId);
    if (error && error.code !== "42P01") {
      console.warn(`Cleanup warning for ${table}: ${error.message}`);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.warn(`Auth cleanup warning: ${deleteError.message}`);
  }
}
