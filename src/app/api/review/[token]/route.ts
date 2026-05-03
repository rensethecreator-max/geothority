import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/reputation/request-service";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = String(params.token || "").trim();
    if (!token) {
      return NextResponse.json({ error: "Review token is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";

    if (action !== "open_google" && action !== "use_template") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    if (action === "use_template" && !templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("reputation_requests")
      .select("id, user_id, status, template_used, google_link_sent")
      .eq("review_token", token)
      .maybeSingle();

    if (requestError) {
      if (isMissingTableError(requestError)) {
        return NextResponse.json({ error: "Invalid or unavailable review link" }, { status: 404 });
      }
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    if (!requestRow || requestRow.status !== "public_review_ready") {
      return NextResponse.json({ error: "Invalid or unavailable review link" }, { status: 404 });
    }

    if (!requestRow.google_link_sent) {
      const { error: updateError } = await supabase
        .from("reputation_requests")
        .update({ google_link_sent: true })
        .eq("id", requestRow.id)
        .eq("status", "public_review_ready");

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    if (action === "use_template" && !requestRow.template_used) {
      const { error: updateError } = await supabase
        .from("reputation_requests")
        .update({ template_used: templateId })
        .eq("id", requestRow.id)
        .is("template_used", null)
        .eq("status", "public_review_ready");

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    if (action === "use_template" && !requestRow.template_used) {
      const { data: templateRow } = await supabase
        .from("reputation_templates")
        .select("id, usage_count")
        .eq("id", templateId)
        .eq("user_id", requestRow.user_id)
        .maybeSingle();

      if (templateRow?.id) {
        await supabase
          .from("reputation_templates")
          .update({ usage_count: (templateRow.usage_count ?? 0) + 1 })
          .eq("id", templateRow.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
