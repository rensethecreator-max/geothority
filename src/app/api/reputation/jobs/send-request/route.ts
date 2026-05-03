import { NextRequest, NextResponse } from "next/server";
import { sendReputationRequestNow } from "@/lib/reputation/request-service";
import { constantTimeEquals, isUuid } from "@/lib/security/request-auth";

function hasValidJobSecret(req: NextRequest) {
  const configuredSecret = process.env.GEOTHORITY_REPUTATION_JOB_SECRET;
  if (!configuredSecret) {
    return { ok: false as const, error: "GEOTHORITY_REPUTATION_JOB_SECRET is not configured", status: 503 };
  }

  const providedSecret = req.headers.get("x-geothority-job-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!constantTimeEquals(providedSecret, configuredSecret)) {
    return { ok: false as const, error: "Invalid job secret", status: 401 };
  }

  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  try {
    const secretState = hasValidJobSecret(req);
    if (!secretState.ok) {
      return NextResponse.json({ error: secretState.error }, { status: secretState.status });
    }

    const { requestId } = await req.json();
    if (!requestId || !isUuid(String(requestId))) {
      return NextResponse.json({ error: "Valid requestId required" }, { status: 400 });
    }

    const result = await sendReputationRequestNow(requestId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
