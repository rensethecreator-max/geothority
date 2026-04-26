import { NextRequest, NextResponse } from "next/server";
import { processAllPendingJourneys } from "@/lib/email-journey-service";
import { processAllPendingPushJourneys } from "@/lib/push-notification-service";

// Cron endpoint: process all pending email + push journeys.
// Call every 15 minutes via Railway cron, GitHub Actions, or another scheduler.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  console.log("[cron/journeys] Starting journey processing...");

  try {
    await Promise.allSettled([
      processAllPendingJourneys(),
      processAllPendingPushJourneys(),
    ]);

    const elapsed = Date.now() - start;
    console.log(`[cron/journeys] Done in ${elapsed}ms`);

    return NextResponse.json({ ok: true, elapsed });
  } catch (err: any) {
    console.error("[cron/journeys] Error:", err);
    return NextResponse.json({ error: "Journey processing failed", details: err.message }, { status: 500 });
  }
}
