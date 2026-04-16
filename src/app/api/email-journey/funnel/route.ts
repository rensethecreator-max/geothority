import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/server";
import { getJourneyConfig } from "@/lib/email-journey-service";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const journeyId = url.searchParams.get("journeyId") ?? "onboarding";

  const config = getJourneyConfig(journeyId);
  if (!config) {
    return NextResponse.json({ error: `Journey "${journeyId}" not found` }, { status: 404 });
  }

  const supabase = createServiceClient();

  const { count: totalEnrolled } = await supabase
    .from("user_email_journey_progress")
    .select("*", { count: "exact", head: true })
    .eq("journey_id", journeyId);

  const total = totalEnrolled ?? 0;

  const funnelSteps = await Promise.all(
    config.steps.map(async (step) => {
      const { count: reached } = await supabase
        .from("user_email_journey_progress")
        .select("*", { count: "exact", head: true })
        .eq("journey_id", journeyId)
        .gte("current_step_order", step.stepOrder);

      return {
        stepOrder: step.stepOrder,
        name: step.name,
        templateId: step.templateId,
        type: step.type,
        reached: reached ?? 0,
        dropOff: total - (reached ?? 0),
        conversionRate: total > 0 ? Math.round(((reached ?? 0) / total) * 100) : 0,
      };
    })
  );

  const { count: completed } = await supabase
    .from("user_email_journey_progress")
    .select("*", { count: "exact", head: true })
    .eq("journey_id", journeyId)
    .eq("status", "completed");

  return NextResponse.json({
    journeyId,
    journeyName: config.name,
    totalEnrolled: total,
    completed: completed ?? 0,
    completionRate: total > 0 ? Math.round(((completed ?? 0) / total) * 100) : 0,
    steps: funnelSteps,
  });
}
