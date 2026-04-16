import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const issueId = params.id;
  const supabase = createServiceClient();

  const { data: issue, error: fetchErr } = await supabase
    .from("diagnostic_issues")
    .select("*")
    .eq("id", issueId)
    .single();

  if (fetchErr || !issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  let actionType = "manual_review";
  let result = "No automatic repair available for this issue type.";
  let status: "success" | "failed" | "pending" = "pending";

  switch (issue.issue_type) {
    case "db_connectivity": {
      const { error: testErr } = await supabase.from("user_profiles").select("id").limit(1);
      if (!testErr) {
        actionType = "db_reconnect";
        result = "DB connection re-established successfully.";
        status = "success";
        await supabase.from("diagnostic_issues")
          .update({ status: "resolved", resolved_at: new Date().toISOString() })
          .eq("id", issueId);
      } else {
        actionType = "db_reconnect";
        result = `DB still unreachable: ${testErr.message}`;
        status = "failed";
      }
      break;
    }

    case "env_var_integrity": {
      actionType = "env_var_guidance";
      result = "Fix env vars in Vercel settings. Remove invisible characters and redeploy.";
      status = "pending";
      break;
    }

    case "stripe_webhook_secret": {
      const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
      if (secret.startsWith("whsec_") && secret.length >= 32) {
        actionType = "stripe_webhook_check";
        result = "Stripe webhook secret now appears valid.";
        status = "success";
        await supabase.from("diagnostic_issues")
          .update({ status: "resolved", resolved_at: new Date().toISOString() })
          .eq("id", issueId);
      } else {
        actionType = "stripe_webhook_check";
        result = "STRIPE_WEBHOOK_SECRET still invalid. Update it in your environment.";
        status = "failed";
      }
      break;
    }

    case "missing_table": {
      actionType = "migration_instructions";
      result = "Run the Supabase SQL migration from supabase/migration.sql in the Supabase SQL editor.";
      status = "pending";
      break;
    }

    case "google_api_config": {
      actionType = "config_guidance";
      result = "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your Vercel environment variables.";
      status = "pending";
      break;
    }

    default: {
      actionType = "manual_review";
      result = `Issue type '${issue.issue_type}' has no automated repair. Please review manually.`;
      status = "pending";
    }
  }

  // Mark repair attempted
  await supabase.from("diagnostic_issues")
    .update({ auto_repair_attempted: true })
    .eq("id", issueId);

  // Log repair action
  const { data: repairData, error: repairErr } = await supabase
    .from("repair_actions")
    .insert({
      issue_id: issueId,
      action_type: actionType,
      status,
      result,
    })
    .select()
    .single();

  if (repairErr) {
    return NextResponse.json({ error: "Repair log failed" }, { status: 500 });
  }

  return NextResponse.json({ repair: repairData, message: result });
}
