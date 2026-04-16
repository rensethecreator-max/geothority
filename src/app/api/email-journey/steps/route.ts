import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isAdminUser } from "@/lib/auth-helpers";
import { getAllJourneyIds, getJourneyConfig } from "@/lib/email-journey-service";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const journeyIds = getAllJourneyIds();
  const allSteps: any[] = [];
  for (const jid of journeyIds) {
    const config = getJourneyConfig(jid);
    if (config) {
      config.steps.forEach((step) => allSteps.push({ ...step, journeyId: jid }));
    }
  }

  return NextResponse.json({ steps: allSteps, source: "config" });
}
