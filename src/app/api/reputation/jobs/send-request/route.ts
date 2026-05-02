import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const { requestId } = await req.json();
    if (!requestId) {
      return NextResponse.json({ error: "requestId required" }, { status: 400 });
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("reputation_requests")
      .select("id, user_id, business_id, contact_id, status")
      .eq("id", requestId)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: requestError?.message || "Request not found" }, { status: 404 });
    }

    const { data: settings } = await supabase
      .from("reputation_settings")
      .select("sms_template")
      .eq("user_id", requestRow.user_id)
      .maybeSingle();

    const { data: contact } = await supabase
      .from("reputation_contacts")
      .select("name, phone")
      .eq("id", requestRow.contact_id)
      .single();

    const body = (settings?.sms_template || "Hi {customer_name}! Thanks for choosing {business_name}. How was your experience? Reply 1-5 and we'll take it from there. (Reply STOP to opt out)")
      .replace("{customer_name}", contact?.name || "there")
      .replace("{business_name}", requestRow.business_id);

    await supabase.from("reputation_message_log").insert({
      request_id: requestRow.id,
      direction: "out",
      body,
      provider_sid: null,
    });

    await supabase
      .from("reputation_requests")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", requestRow.id);

    return NextResponse.json({ success: true, simulated: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
