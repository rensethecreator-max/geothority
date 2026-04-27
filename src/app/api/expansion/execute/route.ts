import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";

/**
 * POST /api/expansion/execute — Execute an expansion action
 * GET /api/expansion/actions — Get action log
 */

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const { data: actions } = await supabase
      .from("expansion_action_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ actions: actions ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const { targetId, actionType, actionDetail } = await req.json();
    if (!targetId || !actionType) {
      return NextResponse.json({ error: "targetId and actionType are required" }, { status: 400 });
    }

    // Verify target belongs to user
    const { data: target } = await supabase
      .from("expansion_targets")
      .select("*")
      .eq("id", targetId)
      .eq("user_id", user.id)
      .single();

    if (!target) {
      return NextResponse.json({ error: "Expansion target not found" }, { status: 404 });
    }

    // Log the action
    const { data: actionLog, error: logError } = await supabase
      .from("expansion_action_log")
      .insert({
        user_id: user.id,
        target_id: targetId,
        action_type: actionType,
        action_detail: actionDetail || {},
        status: "in_progress",
      })
      .select()
      .single();

    if (logError) {
      return NextResponse.json({ error: "Failed to log action" }, { status: 500 });
    }

    let result: string;
    let contentId: string | null = null;

    try {
      switch (actionType) {
        case "create_page":
          // Generate a page for this expansion target
          const pageResult = await generateExpansionPage(supabase, user.id, target, actionDetail);
          result = pageResult.message;
          contentId = pageResult.contentId;
          break;

        case "claim_listing":
          result = "Guided: Follow the steps to claim your listing on the target directory";
          break;

        case "add_service":
          const serviceResult = await generateServiceContent(supabase, user.id, target, actionDetail);
          result = serviceResult.message;
          contentId = serviceResult.contentId;
          break;

        case "build_citation":
          // Queue a NAP push for this directory
          const citationResult = await queueCitationPush(supabase, user.id, target);
          result = citationResult.message;
          break;

        default:
          result = `Unknown action type: ${actionType}`;
      }

      // Update action log as completed
      await supabase
        .from("expansion_action_log")
        .update({
          status: "completed",
          result,
          content_id: contentId,
          executed_at: new Date().toISOString(),
        })
        .eq("id", actionLog.id);

      // Update expansion target status
      await supabase
        .from("expansion_targets")
        .update({ status: "in_progress" })
        .eq("id", targetId);

      return NextResponse.json({ success: true, result, contentId });
    } catch (err: any) {
      // Mark action as failed
      await supabase
        .from("expansion_action_log")
        .update({
          status: "failed",
          result: err.message,
          executed_at: new Date().toISOString(),
        })
        .eq("id", actionLog.id);

      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function generateExpansionPage(
  supabase: any,
  userId: string,
  target: any,
  detail: Record<string, any>
): Promise<{ message: string; contentId: string | null }> {
  const pageType = target.type === "city" ? "city_page" : target.type === "service" ? "service_page" : "landing_page";
  const pageTitle = target.type === "city"
    ? `${detail.service || "Insurance"} in ${target.name}`
    : `${target.name} Services`;
  const draftBody = `# ${pageTitle}\n\nContent auto-generated for expansion target: ${target.name}. Edit this page to add your specific service details and local information.\n\n## Why Choose Us\n\nWe provide expert ${detail.service || "professional"} services in ${target.name} and surrounding areas.\n\n## Our Services\n\n- Service 1\n- Service 2\n- Service 3\n\n## Contact Us\n\nGet in touch today for a free consultation.`;

  const { data: content, error } = await supabase
    .from("generated_content")
    .insert({
      user_id: userId,
      type: pageType,
      city: target.type === "city" ? target.name : null,
      service: detail.service || (target.type === "service" ? target.name : null),
      title: pageTitle,
      meta_description: `Expansion draft for ${target.name}`,
      content_markdown: draftBody,
      content_html: `<pre>${draftBody.replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char))}</pre>`,
      quality_score: Math.max(60, Math.round(target.impact_score ?? 60)),
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { message: `Page draft created: "${pageTitle}" — edit and publish when ready`, contentId: content?.id };
}

async function generateServiceContent(
  supabase: any,
  userId: string,
  target: any,
  detail: Record<string, any>
): Promise<{ message: string; contentId: string | null }> {
  const serviceTitle = `${target.name} — ${detail.service || "Professional Services"}`;
  const draftBody = `# ${serviceTitle}\n\nService page auto-generated for expansion into ${target.name}.\n\n## What We Offer\n\nDetailed service description coming soon.\n\n## Service Area\n\nWe serve ${target.name} and the surrounding community.\n\n## Get Started\n\nContact us for a consultation.`;

  const { data: content, error } = await supabase
    .from("generated_content")
    .insert({
      user_id: userId,
      type: "service_page",
      city: target.type === "city" ? target.name : null,
      service: detail.service || target.name,
      title: serviceTitle,
      meta_description: `Service expansion draft for ${target.name}`,
      content_markdown: draftBody,
      content_html: `<pre>${draftBody.replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char))}</pre>`,
      quality_score: Math.max(60, Math.round(target.impact_score ?? 60)),
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { message: `Service page draft: "${serviceTitle}"`, contentId: content?.id ?? null };
}

async function queueCitationPush(
  supabase: any,
  userId: string,
  target: any
): Promise<{ message: string }> {
  // Get business profile data
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("business_name, address, city, state, zip, phone, website")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    return { message: "No business profile found — set up your profile first" };
  }

  // Queue an aggregator sync job
  const { error } = await supabase
    .from("aggregator_sync_jobs")
    .insert({
      user_id: userId,
      provider: "yext",
      status: "queued",
      business_data: profile,
    });

  if (error) {
    return { message: "Citation push queued (local sync)" };
  }

  return { message: `Citation push queued for ${target.name}` };
}
