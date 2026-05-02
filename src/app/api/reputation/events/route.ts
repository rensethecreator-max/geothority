import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { createAndSendReputationRequest } from "@/lib/reputation/request-service";

async function getSessionUser() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

const ALLOWED_EVENT_TYPES = new Set(["appointment_completed", "job_completed", "delivery_completed", "api"]);

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const body = await req.json();
    const businessName = String(body.businessName || "").trim();
    const customerName = String(body.customerName || "").trim();
    const phone = String(body.phone || "").trim();
    const eventType = String(body.eventType || body.triggerSource || "api").trim() || "api";

    if (!businessName || !customerName || !phone) {
      return NextResponse.json({ error: "businessName, customerName, and phone are required" }, { status: 400 });
    }

    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: "Unsupported eventType" }, { status: 400 });
    }

    const result = await createAndSendReputationRequest({
      supabase,
      userId: user.id,
      businessName,
      customerName,
      phone,
      triggerSource: eventType,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, requestId: result.requestId, triggerSource: eventType });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
