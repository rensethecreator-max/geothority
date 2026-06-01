import { NextRequest, NextResponse } from "next/server";
import { getLayerScores, getWeakestLayer } from "@/lib/activation-diagnosis";
import { generateContent, type ContentType } from "@/lib/content-generation";
import {
  appendOperatorRunEvent,
  createOperatorRun,
  finalizeOperatorRun,
} from "@/lib/operator-runs";
import { getReputationBusinessIdentity } from "@/lib/reputation/business-identity";
import { planMeetsMin, type PlanTier } from "@/lib/plan-gate";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OperatorLaunchResponse = {
  status: "blocked" | "ready" | "launched" | "resumed" | "failed";
  operatorAction: string;
  message: string;
  redirectTo?: string | null;
  planId?: string | null;
  runId?: string | null;
};

const LAYER2_CONTENT_SEQUENCE: ContentType[] = ["trust_page", "localized_faq", "about"];

async function callInternalJson(
  request: NextRequest,
  path: string,
  init?: RequestInit
) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const cookie = request.headers.get("cookie");
  const authorization = request.headers.get("authorization");

  if (cookie) headers.set("cookie", cookie);
  if (authorization) headers.set("authorization", authorization);

  return fetch(new URL(path, request.nextUrl.origin), {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function POST(request: NextRequest) {
  let runId: string | null = null;
  let userId: string | null = null;

  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = user.id;
    const requestBody = await request.clone().json().catch(() => ({}));
    const chainDepth =
      typeof requestBody?.chainDepth === "number" && Number.isFinite(requestBody.chainDepth)
        ? requestBody.chainDepth
        : 0;

    const [
      { data: latestScan, error: latestScanError },
      { data: gbpProfile, error: gbpError },
      { data: reputationSettings, error: reputationError },
      { data: profile, error: profileError },
      { data: businessProfile, error: businessProfileError },
      { data: activePlan, error: activePlanError },
      { data: latestCompletedPlan, error: completedPlanError },
      reputationRequestsResult,
      { data: authSession },
    ] = await Promise.all([
      supabase
        .from("scans")
        .select("id, business_name, city, state, layer_scores, raw_scan_data, url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("gbp_profiles")
        .select("id, business_name, last_synced_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("reputation_settings")
        .select("google_review_link, active")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("business_profiles")
        .select("business_name, address, city, state, zip, phone, website")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("fix_execution_plans")
        .select("id, scan_id, status, mode, progress, updated_at")
        .eq("user_id", user.id)
        .in("status", ["planning", "executing", "paused"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("fix_execution_plans")
        .select("id, scan_id, status, mode, progress, updated_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("reputation_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase.auth.getSession(),
    ]);

    if (latestScanError) console.error("Operator latest scan query error:", latestScanError);
    if (gbpError) console.error("Operator GBP query error:", gbpError);
    if (reputationError) console.error("Operator reputation query error:", reputationError);
    if (profileError) console.error("Operator profile query error:", profileError);
    if (businessProfileError) console.error("Operator business profile query error:", businessProfileError);
    if (activePlanError) console.error("Operator active plan query error:", activePlanError);
    if (completedPlanError) console.error("Operator completed plan query error:", completedPlanError);
    if (reputationRequestsResult.error) {
      console.error("Operator reputation requests query error:", reputationRequestsResult.error);
    }

    const { data: latestReputationContact, error: reputationContactError } = await supabase
      .from("reputation_contacts")
      .select("id, name, phone, opt_out, created_at")
      .eq("user_id", user.id)
      .eq(
        "business_key",
        getReputationBusinessIdentity(
          latestScan?.business_name || gbpProfile?.business_name || "Your Business"
        ).businessKey
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reputationContactError) {
      console.error("Operator reputation contact query error:", reputationContactError);
    }

    const run = await createOperatorRun({
      userId: user.id,
      scanId: latestScan?.id ?? null,
      operatorAction: "operator_launch_started",
      message: "Operator launch requested.",
      metadata: {
        trigger:
          typeof requestBody?.trigger === "string" ? requestBody.trigger : "manual_or_surface",
        sourcePlanId:
          typeof requestBody?.sourcePlanId === "string" ? requestBody.sourcePlanId : null,
        sourceRunId:
          typeof requestBody?.sourceRunId === "string" ? requestBody.sourceRunId : null,
        sourceScanId:
          typeof requestBody?.sourceScanId === "string" ? requestBody.sourceScanId : null,
        chainDepth,
      },
    });

    runId = run?.id ?? null;

    if (runId) {
      await appendOperatorRunEvent({
        runId,
        userId: user.id,
        stage: "intake",
        status: "started",
        title: "Operator intake started",
        detail: "Loading latest scan, activation signals, and current execution state.",
      });
    }

    if (!latestScan) {
      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "intake",
          status: "blocked",
          title: "First scan required",
          detail: "The operator cannot coordinate a next step until a baseline scan exists.",
        });
        await finalizeOperatorRun({
          runId,
          status: "blocked",
          operatorAction: "operator_blocked_no_scan",
          message: "Run your first scan so the operator has a live trust diagnosis to act on.",
          redirectTo: "/scan",
          currentStage: "intake",
          stageStatus: "blocked",
        });
      }

      const payload: OperatorLaunchResponse = {
        status: "blocked",
        operatorAction: "operator_blocked_no_scan",
        message: "Run your first scan so the operator has a live trust diagnosis to act on.",
        redirectTo: "/scan",
        runId,
      };

      return NextResponse.json(payload);
    }

    if (runId) {
      await appendOperatorRunEvent({
        runId,
        userId: user.id,
        stage: "intake",
        status: "completed",
        title: "Latest scan loaded",
        detail: `Loaded ${latestScan.business_name || "latest business"} and evaluated live activation state.`,
        metadata: { scanId: latestScan.id },
      });
    }

    const gbpConnected = Boolean(authSession.data.session?.provider_token || gbpProfile);
    const reputationActivated = Boolean(
      reputationSettings?.active || reputationSettings?.google_review_link
    );

    if (!gbpConnected) {
      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "activation_gate",
          status: "redirected",
          title: "GBP connection required",
          detail: "Operator paused execution because Google Business Profile is not connected yet.",
        });
        await finalizeOperatorRun({
          runId,
          status: "blocked",
          operatorAction: "operator_blocked_gbp_required",
          message: "Connect GBP first so the operator can act on live local profile signals.",
          redirectTo: "/gbp-health",
          currentStage: "activation_gate",
          stageStatus: "blocked",
        });
      }

      return NextResponse.json({
        status: "blocked",
        operatorAction: "operator_blocked_gbp_required",
        message: "Connect GBP first so the operator can act on live local profile signals.",
        redirectTo: "/gbp-health",
        runId,
      } satisfies OperatorLaunchResponse);
    }

    if (!reputationActivated) {
      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "activation_gate",
          status: "redirected",
          title: "Reputation Engine activation required",
          detail: "Operator paused execution because reputation automation is not fully activated.",
        });
        await finalizeOperatorRun({
          runId,
          status: "blocked",
          operatorAction: "operator_blocked_reputation_required",
          message: "Activate the Reputation Engine before the operator starts compounding workflows.",
          redirectTo: "/reputation",
          currentStage: "activation_gate",
          stageStatus: "blocked",
        });
      }

      return NextResponse.json({
        status: "blocked",
        operatorAction: "operator_blocked_reputation_required",
        message: "Activate the Reputation Engine before the operator starts compounding workflows.",
        redirectTo: "/reputation",
        runId,
      } satisfies OperatorLaunchResponse);
    }

    if (activePlan?.id) {
      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "execution",
          status: "completed",
          title: "Existing plan resumed",
          detail: "Operator found an active execution plan and routed back to it instead of launching a duplicate.",
          metadata: { planId: activePlan.id, status: activePlan.status },
        });
        await finalizeOperatorRun({
          runId,
          status: "resumed",
          operatorAction: "operator_resumed_active_plan",
          message: "An active execution plan already exists, so the operator resumed that workflow.",
          redirectTo: `/scan/${activePlan.scan_id ?? latestScan.id}#fix-package`,
          currentStage: "execution",
          stageStatus: "completed",
          planId: activePlan.id,
        });
      }

      return NextResponse.json({
        status: "resumed",
        operatorAction: "operator_resumed_active_plan",
        message: "An active execution plan already exists, so the operator resumed that workflow.",
        redirectTo: `/scan/${activePlan.scan_id ?? latestScan.id}#fix-package`,
        planId: activePlan.id,
        runId,
      } satisfies OperatorLaunchResponse);
    }

    const layerScores = getLayerScores(latestScan.layer_scores);
    const weakestLayer = getWeakestLayer(layerScores);
    const userPlan = (profile?.plan as PlanTier | null) ?? "free";
    const reputationRequestCount = reputationRequestsResult.count ?? 0;
    const scanContext = (latestScan.raw_scan_data ?? {}) as Record<string, unknown>;
    const businessName =
      latestScan.business_name || gbpProfile?.business_name || businessProfile?.business_name || "Your Business";
    const city = businessProfile?.city || latestScan.city || null;
    const state = businessProfile?.state || latestScan.state || null;
    const businessType =
      (typeof scanContext.businessType === "string" && scanContext.businessType) ||
      (typeof scanContext.primaryCategory === "string" && scanContext.primaryCategory) ||
      (typeof scanContext.category === "string" && scanContext.category) ||
      (typeof scanContext.industry === "string" && scanContext.industry) ||
      "local business";

    if (weakestLayer?.[0] === "layer1" && planMeetsMin(userPlan, "growth")) {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentGbpPosts, error: recentGbpPostsError } = await supabase
        .from("gbp_posts")
        .select("id, status, created_at, published_at, title")
        .eq("user_id", user.id)
        .gte("created_at", oneWeekAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentGbpPostsError) {
        console.error("Operator GBP posts query error:", recentGbpPostsError);
      }

      const reusableGbpPost =
        recentGbpPosts?.find((post) =>
          ["draft", "approved", "pending_approval"].includes(post.status)
        ) ?? null;

      if (reusableGbpPost) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "gbp_actions",
            status: "completed",
            title: "Existing GBP post resumed",
            detail: "Operator found a recent GBP post draft/approval candidate and routed back to it instead of generating another one.",
            metadata: { postId: reusableGbpPost.id, status: reusableGbpPost.status },
          });
          await finalizeOperatorRun({
            runId,
            status: "resumed",
            operatorAction: "operator_resumed_gbp_post_draft",
            message: "A GBP post is already queued from the last week, so the operator resumed that action instead of duplicating it.",
            redirectTo: "/gbp-posts",
            currentStage: "gbp_actions",
            stageStatus: "completed",
          });
        }

        return NextResponse.json({
          status: "resumed",
          operatorAction: "operator_resumed_gbp_post_draft",
          message: "A GBP post is already queued from the last week, so the operator resumed that action instead of duplicating it.",
          redirectTo: "/gbp-posts",
          runId,
        } satisfies OperatorLaunchResponse);
      }

      const recentlyPublishedGbpPost =
        recentGbpPosts?.find((post) =>
          ["published", "published_local"].includes(post.status)
        ) ?? null;

      if (recentlyPublishedGbpPost) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "gbp_actions",
            status: "info",
            title: "GBP posting cadence already active",
            detail: "Operator found a recently published GBP post and avoided generating extra activity too soon.",
            metadata: { postId: recentlyPublishedGbpPost.id, status: recentlyPublishedGbpPost.status },
          });
          await finalizeOperatorRun({
            runId,
            status: "ready",
            operatorAction: "operator_ready_recent_gbp_post_exists",
            message: "GBP authority is still the weakest layer, but you already have a recent GBP post live. Review GBP health before posting again.",
            redirectTo: "/gbp-posts",
            currentStage: "gbp_actions",
            stageStatus: "ready",
          });
        }

        return NextResponse.json({
          status: "ready",
          operatorAction: "operator_ready_recent_gbp_post_exists",
          message: "GBP authority is still the weakest layer, but you already have a recent GBP post live. Review GBP health before posting again.",
          redirectTo: "/gbp-posts",
          runId,
        } satisfies OperatorLaunchResponse);
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "gbp_actions",
          status: "started",
          title: "Launching GBP post workflow",
          detail: "Foundation authority is the weakest layer, so the operator is generating a GBP post automatically.",
        });
      }

      const gbpGenerateResponse = await callInternalJson(request, "/api/gbp/posts", {
        method: "POST",
        body: JSON.stringify({
          action: "generate",
        }),
      });

      const gbpGeneratePayload = await gbpGenerateResponse.json().catch(() => ({}));
      if (!gbpGenerateResponse.ok) {
        throw new Error(gbpGeneratePayload.error || "Failed to generate GBP post suggestions.");
      }

      const generatedPost = gbpGeneratePayload?.suggestions?.[0] ?? null;
      if (!generatedPost?.id) {
        throw new Error("GBP post generation did not return a usable draft.");
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "gbp_actions",
          status: "completed",
          title: "GBP draft generated",
          detail: "Operator generated a fresh GBP post draft to improve activity signals on the profile.",
          metadata: { postId: generatedPost.id, title: generatedPost.title ?? null },
        });
      }

      const gbpPublishResponse = await callInternalJson(request, "/api/gbp/posts", {
        method: "POST",
        body: JSON.stringify({
          action: "publish",
          postId: generatedPost.id,
        }),
      });

      const gbpPublishPayload = await gbpPublishResponse.json().catch(() => ({}));

      if (gbpPublishResponse.ok) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "gbp_publish",
            status: "completed",
            title: "GBP post published",
            detail: gbpPublishPayload.publishedToGoogle
              ? "The operator published the GBP post directly to Google Business Profile."
              : "The operator saved the GBP post locally because direct Google publishing was unavailable.",
            metadata: {
              postId: generatedPost.id,
              publishedToGoogle: gbpPublishPayload.publishedToGoogle ?? false,
              warning: gbpPublishPayload.warning ?? null,
            },
          });
          await finalizeOperatorRun({
            runId,
            status: "launched",
            operatorAction: gbpPublishPayload.publishedToGoogle
              ? "operator_launched_gbp_post"
              : "operator_launched_gbp_post_local",
            message: gbpPublishPayload.publishedToGoogle
              ? "Foundation authority was weakest, so the operator generated and published a GBP post automatically."
              : gbpPublishPayload.warning ||
                "Foundation authority was weakest, so the operator generated a GBP post and saved it locally for the GBP workflow.",
            redirectTo: "/gbp-posts",
            currentStage: "gbp_publish",
            stageStatus: "completed",
          });
        }

        return NextResponse.json({
          status: "launched",
          operatorAction: gbpPublishPayload.publishedToGoogle
            ? "operator_launched_gbp_post"
            : "operator_launched_gbp_post_local",
          message: gbpPublishPayload.publishedToGoogle
            ? "Foundation authority was weakest, so the operator generated and published a GBP post automatically."
            : gbpPublishPayload.warning ||
              "Foundation authority was weakest, so the operator generated a GBP post and saved it locally for the GBP workflow.",
          redirectTo: "/gbp-posts",
          runId,
        } satisfies OperatorLaunchResponse);
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "gbp_publish",
          status: gbpPublishResponse.status === 403 ? "blocked" : "info",
          title: "GBP draft waiting for approval or publish setup",
          detail:
            gbpPublishPayload.error ||
            "The operator generated the GBP post draft, but publishing stayed manual because policy or profile setup blocked auto-publish.",
          metadata: { postId: generatedPost.id, statusCode: gbpPublishResponse.status },
        });
        await finalizeOperatorRun({
          runId,
          status: "launched",
          operatorAction: "operator_launched_gbp_post_draft",
          message:
            gbpPublishPayload.error ||
            "Foundation authority was weakest, so the operator generated a GBP post draft and queued it for review.",
          redirectTo: "/gbp-posts",
          currentStage: "gbp_publish",
          stageStatus: gbpPublishResponse.status === 403 ? "blocked" : "ready",
        });
      }

      return NextResponse.json({
        status: "launched",
        operatorAction: "operator_launched_gbp_post_draft",
        message:
          gbpPublishPayload.error ||
          "Foundation authority was weakest, so the operator generated a GBP post draft and queued it for review.",
        redirectTo: "/gbp-posts",
        runId,
      } satisfies OperatorLaunchResponse);
    }

    if (weakestLayer?.[0] === "layer4" && reputationRequestCount === 0) {
      if (!latestReputationContact?.phone || latestReputationContact.opt_out) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "reputation",
            status: "blocked",
            title: "First reputation request is blocked",
            detail:
              "Review momentum is the weakest layer, but there is no sendable customer contact yet for the Reputation Engine.",
          });
          await finalizeOperatorRun({
            runId,
            status: "ready",
            operatorAction: "operator_ready_reputation_contact_needed",
            message:
              "Review momentum is the main bottleneck. Add one customer contact in Reputation and the operator can launch the first request.",
            redirectTo: "/reputation",
            currentStage: "reputation",
            stageStatus: "blocked",
          });
        }

        return NextResponse.json({
          status: "ready",
          operatorAction: "operator_ready_reputation_contact_needed",
          message:
            "Review momentum is the main bottleneck. Add one customer contact in Reputation and the operator can launch the first request.",
          redirectTo: "/reputation",
          runId,
        } satisfies OperatorLaunchResponse);
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "reputation",
          status: "started",
          title: "Launching first reputation request",
          detail:
            "Review momentum is the weakest layer, so the operator is starting the first Reputation Engine request automatically.",
          metadata: {
            contactId: latestReputationContact.id,
            contactName: latestReputationContact.name,
          },
        });
      }

      const reputationResponse = await callInternalJson(request, "/api/reputation/requests", {
        method: "POST",
        body: JSON.stringify({
          businessName: latestScan.business_name || gbpProfile?.business_name || "Your Business",
          customerName: latestReputationContact.name || "Customer",
          phone: latestReputationContact.phone,
          triggerSource: "operator_first_request",
        }),
      });

      const reputationPayload = await reputationResponse.json().catch(() => ({}));

      if (!reputationResponse.ok) {
        throw new Error(reputationPayload.error || "Failed to launch the first reputation request.");
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "reputation",
          status: "completed",
          title: "First reputation request launched",
          detail:
            "The operator successfully started the first review request and moved the Reputation Engine into a live send state.",
          metadata: {
            requestId: reputationPayload.requestId,
            deduplicated: reputationPayload.deduplicated ?? false,
            sendOutcome: reputationPayload.sendOutcome ?? null,
          },
        });
        await finalizeOperatorRun({
          runId,
          status: "launched",
          operatorAction: "operator_launched_first_reputation_request",
          message:
            "Review momentum was the weakest live layer, so the operator launched the first Reputation Engine request automatically.",
          redirectTo: "/reputation",
          currentStage: "reputation",
          stageStatus: "completed",
        });
      }

      return NextResponse.json({
        status: "launched",
        operatorAction: "operator_launched_first_reputation_request",
        message:
          "Review momentum was the weakest live layer, so the operator launched the first Reputation Engine request automatically.",
        redirectTo: "/reputation",
        runId,
      } satisfies OperatorLaunchResponse);
    }

    if (weakestLayer?.[0] === "layer3" && planMeetsMin(userPlan, "growth")) {
      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "citations",
          status: "started",
          title: "Launching citation sync",
          detail:
            "Citation consistency is the weakest live layer, so the operator is starting listing sync automatically.",
        });
      }

      const syncResponse = await callInternalJson(request, "/api/citations/sync", {
        method: "POST",
        body: JSON.stringify({
          businessName:
            businessProfile?.business_name || latestScan.business_name || gbpProfile?.business_name || "Your Business",
          address: businessProfile?.address || undefined,
          city: businessProfile?.city || latestScan.city || undefined,
          state: businessProfile?.state || latestScan.state || undefined,
          zip: businessProfile?.zip || undefined,
          phone: businessProfile?.phone || undefined,
          website: businessProfile?.website || undefined,
          isAutoAction: true,
        }),
      });

      const syncPayload = await syncResponse.json().catch(() => ({}));

      if (syncResponse.ok) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "citations",
            status: "completed",
            title: "Citation sync started",
            detail:
              "The operator launched the listing sync workflow to start repairing citation consistency automatically.",
            metadata: syncPayload,
          });
          await finalizeOperatorRun({
            runId,
            status: "launched",
            operatorAction: "operator_launched_citation_sync",
            message:
              "Citation consistency was the weakest live layer, so the operator launched listing sync automatically.",
            redirectTo: "/citations",
            currentStage: "citations",
            stageStatus: "completed",
          });
        }

        return NextResponse.json({
          status: "launched",
          operatorAction: "operator_launched_citation_sync",
          message:
            "Citation consistency was the weakest live layer, so the operator launched listing sync automatically.",
          redirectTo: "/citations",
          runId,
        } satisfies OperatorLaunchResponse);
      }

      if (syncResponse.status === 429 || syncResponse.status === 403) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "citations",
            status: "blocked",
            title: "Citation sync could not auto-run",
            detail: syncPayload.details || syncPayload.error || "Listing sync was blocked by plan or rate limits.",
            metadata: syncPayload,
          });
          await finalizeOperatorRun({
            runId,
            status: "ready",
            operatorAction: "operator_ready_citation_sync_blocked",
            message:
              syncPayload.details ||
              syncPayload.message ||
              "Citation sync is the right next move, but the operator could not auto-run it yet.",
            redirectTo: "/citations",
            currentStage: "citations",
            stageStatus: "blocked",
          });
        }

        return NextResponse.json({
          status: "ready",
          operatorAction: "operator_ready_citation_sync_blocked",
          message:
            syncPayload.details ||
            syncPayload.message ||
            "Citation sync is the right next move, but the operator could not auto-run it yet.",
          redirectTo: "/citations",
          runId,
        } satisfies OperatorLaunchResponse);
      }

      throw new Error(syncPayload.error || "Failed to launch citation sync.");
    }

    if (weakestLayer?.[0] === "layer2" && planMeetsMin(userPlan, "authority")) {
      const { data: existingLayer2Content, error: existingLayer2ContentError } = await supabase
        .from("generated_content")
        .select("id, type, status, created_at")
        .eq("user_id", user.id)
        .eq("scan_id", latestScan.id)
        .in("type", LAYER2_CONTENT_SEQUENCE)
        .order("created_at", { ascending: false });

      if (existingLayer2ContentError) {
        console.error("Operator layer2 content query error:", existingLayer2ContentError);
      }

      const pendingLayer2Draft = existingLayer2Content?.find((item) => item.status === "draft") ?? null;
      if (pendingLayer2Draft) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "content",
            status: "completed",
            title: "Existing trust content resumed",
            detail: "Operator found an unpublished trust-content draft and routed back to it instead of generating a duplicate.",
            metadata: { contentId: pendingLayer2Draft.id, type: pendingLayer2Draft.type },
          });
          await finalizeOperatorRun({
            runId,
            status: "resumed",
            operatorAction: "operator_resumed_trust_content_draft",
            message: "A trust-content draft is already waiting in Content Library, so the operator resumed that asset.",
            redirectTo: `/content?contentId=${pendingLayer2Draft.id}`,
            currentStage: "content",
            stageStatus: "completed",
          });
        }

        return NextResponse.json({
          status: "resumed",
          operatorAction: "operator_resumed_trust_content_draft",
          message: "A trust-content draft is already waiting in Content Library, so the operator resumed that asset.",
          redirectTo: `/content?contentId=${pendingLayer2Draft.id}`,
          runId,
        } satisfies OperatorLaunchResponse);
      }

      const nextLayer2ContentType =
        LAYER2_CONTENT_SEQUENCE.find(
          (type) => !existingLayer2Content?.some((item) => item.type === type)
        ) ?? null;

      if (!nextLayer2ContentType) {
        const latestLayer2Content = existingLayer2Content?.[0] ?? null;

        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "content",
            status: "info",
            title: "Trust content already exists",
            detail: "Operator found trust-page assets for this scan already generated, so it routed back for review instead of duplicating them.",
            metadata: latestLayer2Content ? { contentId: latestLayer2Content.id, type: latestLayer2Content.type } : undefined,
          });
          await finalizeOperatorRun({
            runId,
            status: "ready",
            operatorAction: "operator_ready_existing_trust_content",
            message: "Trust-page assets already exist in Content Library. Review or publish those before generating more.",
            redirectTo: latestLayer2Content ? `/content?contentId=${latestLayer2Content.id}` : "/content",
            currentStage: "content",
            stageStatus: "ready",
          });
        }

        return NextResponse.json({
          status: "ready",
          operatorAction: "operator_ready_existing_trust_content",
          message: "Trust-page assets already exist in Content Library. Review or publish those before generating more.",
          redirectTo: latestLayer2Content ? `/content?contentId=${latestLayer2Content.id}` : "/content",
          runId,
        } satisfies OperatorLaunchResponse);
      }

      if (!city) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "content",
            status: "blocked",
            title: "Trust content needs location context",
            detail: "Operator could not auto-generate trust content because the business city is still missing.",
          });
          await finalizeOperatorRun({
            runId,
            status: "ready",
            operatorAction: "operator_ready_trust_content_needs_city",
            message: "Add the business city/profile details first so the operator can auto-generate localized trust content.",
            redirectTo: "/onboarding",
            currentStage: "content",
            stageStatus: "blocked",
          });
        }

        return NextResponse.json({
          status: "ready",
          operatorAction: "operator_ready_trust_content_needs_city",
          message: "Add the business city/profile details first so the operator can auto-generate localized trust content.",
          redirectTo: "/onboarding",
          runId,
        } satisfies OperatorLaunchResponse);
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "content",
          status: "started",
          title: "Launching trust-content generation",
          detail: `Layer 2 is weakest, so the operator is generating a ${nextLayer2ContentType.replace(/_/g, " ")} automatically.`,
          metadata: { contentType: nextLayer2ContentType },
        });
      }

      const { output } = await generateContent({
        contentType: nextLayer2ContentType,
        businessName,
        city,
        state: state || undefined,
        service: businessType,
        targetKeyword: `${businessType} ${city}`,
        scanId: latestScan.id,
        industry: businessType,
      });

      const { data: generatedContent, error: generatedContentError } = await supabase
        .from("generated_content")
        .insert({
          user_id: user.id,
          scan_id: latestScan.id,
          type: nextLayer2ContentType,
          city,
          service: businessType,
          title: output.title || `${businessType} ${nextLayer2ContentType.replace(/_/g, " ")} for ${city}`,
          meta_description: output.metaDescription || "",
          content_html: output.contentHtml || "",
          content_markdown: output.contentMarkdown || "",
          schema_json: output.schema || null,
          quality_score: output.qualityScore || null,
          status: "draft",
        })
        .select("id")
        .single();

      if (generatedContentError || !generatedContent) {
        throw generatedContentError || new Error("Failed to save generated trust content.");
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "content",
          status: "completed",
          title: "Trust-content draft generated",
          detail: `The operator generated a ${nextLayer2ContentType.replace(/_/g, " ")} draft and saved it to Content Library.`,
          metadata: {
            contentId: generatedContent.id,
            contentType: nextLayer2ContentType,
            qualityScore: output.qualityScore ?? null,
          },
        });
      }

      const publishResponse = await callInternalJson(request, "/api/publish", {
        method: "POST",
        body: JSON.stringify({
          contentId: generatedContent.id,
          isAutoAction: true,
        }),
      });

      const publishPayload = await publishResponse.json().catch(() => ({}));

      if (publishResponse.ok) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "content_publish",
            status: "completed",
            title: "Trust content published",
            detail: "The operator generated the content and pushed it live through the connected CMS.",
            metadata: {
              contentId: generatedContent.id,
              liveUrl: publishPayload.liveUrl ?? null,
              cmsPostId: publishPayload.cmsPostId ?? null,
            },
          });
          await finalizeOperatorRun({
            runId,
            status: "launched",
            operatorAction: "operator_launched_trust_content_publish",
            message: "Layer 2 was weakest, so the operator generated and published a trust-content asset automatically.",
            redirectTo: `/content?contentId=${generatedContent.id}`,
            currentStage: "content_publish",
            stageStatus: "completed",
          });
        }

        return NextResponse.json({
          status: "launched",
          operatorAction: "operator_launched_trust_content_publish",
          message: "Layer 2 was weakest, so the operator generated and published a trust-content asset automatically.",
          redirectTo: `/content?contentId=${generatedContent.id}`,
          runId,
        } satisfies OperatorLaunchResponse);
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "content_publish",
          status: publishResponse.status === 403 ? "blocked" : "info",
          title: "Trust-content draft ready for review",
          detail:
            publishPayload.error ||
            "The operator generated the trust-content draft, but publishing stayed manual because the CMS path was not ready.",
          metadata: {
            contentId: generatedContent.id,
            statusCode: publishResponse.status,
          },
        });
        await finalizeOperatorRun({
          runId,
          status: "launched",
          operatorAction: "operator_launched_trust_content_draft",
          message:
            publishPayload.error ||
            "Layer 2 was weakest, so the operator generated a trust-content draft and queued it in Content Library.",
          redirectTo: `/content?contentId=${generatedContent.id}`,
          currentStage: "content_publish",
          stageStatus: publishResponse.status === 403 ? "blocked" : "ready",
        });
      }

      return NextResponse.json({
        status: "launched",
        operatorAction: "operator_launched_trust_content_draft",
        message:
          publishPayload.error ||
          "Layer 2 was weakest, so the operator generated a trust-content draft and queued it in Content Library.",
        redirectTo: `/content?contentId=${generatedContent.id}`,
        runId,
      } satisfies OperatorLaunchResponse);
    }

    if (
      latestCompletedPlan?.id &&
      weakestLayer?.[0] === "layer5" &&
      planMeetsMin(userPlan, "growth")
    ) {
      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "expansion",
          status: "started",
          title: "Expansion branch opened",
          detail: "Latest execution is complete and content coverage is now the weakest layer, so the operator is pivoting to expansion.",
        });
      }

      const recommendationsRes = await callInternalJson(request, "/api/expansion/recommendations", {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (!recommendationsRes.ok) {
        const errorPayload = await recommendationsRes.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to generate expansion recommendations.");
      }

      const autoExecRes = await callInternalJson(request, "/api/expansion/actions/auto-execute", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const autoExecPayload = await autoExecRes.json().catch(() => ({}));

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "expansion",
          status: autoExecRes.ok ? "completed" : "info",
          title: autoExecRes.ok ? "Expansion actions executed" : "Expansion recommendations prepared",
          detail: autoExecRes.ok
            ? `Generated fresh targets and auto-executed ${autoExecPayload.successful ?? 0} eligible actions.`
            : "Generated fresh targets, but auto-execution stayed off so the operator routed to the expansion surface.",
          metadata: autoExecPayload,
        });
        await finalizeOperatorRun({
          runId,
          status: autoExecRes.ok ? "launched" : "ready",
          operatorAction: autoExecRes.ok
            ? "operator_launched_expansion_actions"
            : "operator_ready_expansion_recommendations",
          message: autoExecRes.ok
            ? "Expansion recommendations were refreshed and eligible actions were launched."
            : "Expansion recommendations are ready for review in the expansion workspace.",
          redirectTo: "/expansion",
          currentStage: "expansion",
          stageStatus: autoExecRes.ok ? "completed" : "ready",
        });
      }

      return NextResponse.json({
        status: autoExecRes.ok ? "launched" : "ready",
        operatorAction: autoExecRes.ok
          ? "operator_launched_expansion_actions"
          : "operator_ready_expansion_recommendations",
        message: autoExecRes.ok
          ? "Expansion recommendations were refreshed and eligible actions were launched."
          : "Expansion recommendations are ready for review in the expansion workspace.",
        redirectTo: "/expansion",
        runId,
      } satisfies OperatorLaunchResponse);
    }

    if (runId) {
      await appendOperatorRunEvent({
        runId,
        userId: user.id,
        stage: "fix_package",
        status: "started",
        title: "Fix package check started",
        detail: "Operator is checking for a reusable fix package for the latest scan.",
      });
    }

    const { data: existingFixPackage } = await supabase
      .from("fix_packages")
      .select("scan_id")
      .eq("user_id", user.id)
      .eq("scan_id", latestScan.id)
      .maybeSingle();

    if (!existingFixPackage) {
      const fixPackageRes = await callInternalJson(request, "/api/scan/fix-all", {
        method: "POST",
        body: JSON.stringify({ scanId: latestScan.id }),
      });

      if (!fixPackageRes.ok) {
        const errorPayload = await fixPackageRes.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to generate fix package.");
      }
    }

    if (runId) {
      await appendOperatorRunEvent({
        runId,
        userId: user.id,
        stage: "fix_package",
        status: "completed",
        title: "Fix package ready",
        detail: existingFixPackage
          ? "Operator reused the existing fix package for the latest scan."
          : "Operator generated a fresh fix package for the latest scan.",
      });
      await appendOperatorRunEvent({
        runId,
        userId: user.id,
        stage: "execution_plan",
        status: "started",
        title: "Execution plan build started",
        detail: "Operator is converting the latest fix package into the most autonomous execution plan allowed by policy.",
      });
    }

    const planRes = await callInternalJson(request, "/api/fix-engine/plan", {
      method: "POST",
      body: JSON.stringify({ scanId: latestScan.id, mode: "AUTO" }),
    });

    const planPayload = await planRes.json().catch(() => ({}));
    if (!planRes.ok || !planPayload?.id) {
      throw new Error(planPayload.error || "Failed to build execution plan.");
    }

    if (runId) {
      await appendOperatorRunEvent({
        runId,
        userId: user.id,
        stage: "execution_plan",
        status: "completed",
        title: "Execution plan built",
        detail: `Created ${String(planPayload.mode || "AUTO").toLowerCase()} execution plan ${planPayload.id}.`,
        metadata: { planId: planPayload.id, mode: planPayload.mode },
      });
      await appendOperatorRunEvent({
        runId,
        userId: user.id,
        stage: "execution",
        status: "started",
        title: "Execution launch started",
        detail: "Operator is launching the plan through the fix engine.",
        metadata: { planId: planPayload.id },
      });
    }

    const executeRes = await callInternalJson(request, "/api/fix-engine/execute", {
      method: "POST",
      body: JSON.stringify({ planId: planPayload.id }),
    });

    const executePayload = await executeRes.json().catch(() => ({}));
    if (!executeRes.ok) {
      throw new Error(executePayload.error || "Failed to launch execution plan.");
    }

    if (executePayload?.status === "completed") {
      const generatedArtifacts = Array.isArray(executePayload?.steps)
        ? executePayload.steps.filter(
            (step: any) => step?.artifactType === "generated_content" && step?.artifactId
          )
        : [];

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "execution",
          status: "completed",
          title: "Execution plan completed",
          detail: "The fix engine finished the current plan, so the operator is triggering post-fix verification automatically.",
          metadata: {
            planId: planPayload.id,
            planStatus: executePayload?.status,
            progress: executePayload?.progress,
          },
        });
      }

      if (generatedArtifacts.length > 0) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "content_publish",
            status: "started",
            title: "Generated content publish pass started",
            detail: `Operator found ${generatedArtifacts.length} generated content artifact(s) and is attempting to publish them before rescanning.`,
            metadata: { planId: planPayload.id, artifactCount: generatedArtifacts.length },
          });
        }

        const publishResults = await Promise.all(
          generatedArtifacts.map(async (step: any) => {
            const publishRes = await callInternalJson(request, "/api/publish", {
              method: "POST",
              body: JSON.stringify({
                contentId: step.artifactId,
                isAutoAction: true,
              }),
            });

            const publishPayload = await publishRes.json().catch(() => ({}));
            return {
              stepId: step.id,
              artifactId: step.artifactId as string,
              title: step.title as string | undefined,
              ok: publishRes.ok,
              status: publishRes.status,
              payload: publishPayload,
            };
          })
        );

        const publishedCount = publishResults.filter((result) => result.ok).length;
        const blockedCount = publishResults.length - publishedCount;

        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "content_publish",
            status: blockedCount === 0 ? "completed" : "info",
            title: blockedCount === 0 ? "Generated content published" : "Generated content publish pass finished",
            detail:
              blockedCount === 0
                ? `Published ${publishedCount} generated content artifact(s) before verification.`
                : `Published ${publishedCount} artifact(s); ${blockedCount} remained draft because publish automation was blocked or unavailable.`,
            metadata: {
              planId: planPayload.id,
              publishResults,
            },
          });
        }
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "verification",
          status: "started",
          title: "Post-fix scan started",
          detail: "Operator is rescanning the business to measure score lift from the completed execution plan.",
          metadata: { sourceScanId: latestScan.id, planId: planPayload.id },
        });
      }

      const rescanRes = await callInternalJson(request, "/api/scan", {
        method: "POST",
        body: JSON.stringify({ sourceScanId: latestScan.id }),
      });

      const rescanPayload = await rescanRes.json().catch(() => ({}));
      if (!rescanRes.ok || !rescanPayload?.scan?.id) {
        throw new Error(rescanPayload.error || "Post-fix rescan failed.");
      }

      const afterScanId = rescanPayload.scan.id as string;

      const verifyRes = await callInternalJson(request, "/api/fix-engine/verify", {
        method: "POST",
        body: JSON.stringify({ planId: planPayload.id, afterScanId }),
      });

      const verifyPayload = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) {
        throw new Error(verifyPayload.error || "Post-fix verification failed.");
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "verification",
          status: "completed",
          title: "Post-fix verification completed",
          detail:
            typeof verifyPayload?.verification?.scoreBefore === "number" &&
            typeof verifyPayload?.verification?.scoreAfter === "number"
              ? `Score moved from ${verifyPayload.verification.scoreBefore} to ${verifyPayload.verification.scoreAfter}.`
              : "Post-fix verification completed on the newly generated scan.",
          metadata: {
            planId: planPayload.id,
            afterScanId,
            verification: verifyPayload?.verification ?? null,
          },
        });
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "orchestration",
          status: "started",
          title: "Next operator pass started",
          detail: "Operator is continuing from the fresh verification scan to decide the next best automated move.",
          metadata: { afterScanId, planId: planPayload.id },
        });
      }

      const canContinueOperatorChain = chainDepth < 2;
      const nextOperatorRes = canContinueOperatorChain
        ? await callInternalJson(request, "/api/operator/launch", {
            method: "POST",
            body: JSON.stringify({
              trigger: "post_fix_verification",
              sourcePlanId: planPayload.id,
              sourceRunId: runId,
              sourceScanId: afterScanId,
              chainDepth: chainDepth + 1,
            }),
          })
        : null;

      const nextOperatorPayload = nextOperatorRes
        ? await nextOperatorRes.json().catch(() => ({}))
        : {};

      if (nextOperatorRes?.ok) {
        if (runId) {
          await appendOperatorRunEvent({
            runId,
            userId: user.id,
            stage: "orchestration",
            status: "completed",
            title: "Next operator pass completed",
            detail:
              nextOperatorPayload.message ||
              "Operator completed the follow-on decision from the fresh verification scan.",
            metadata: {
              afterScanId,
              nextRunId: nextOperatorPayload.runId ?? null,
              nextOperatorAction: nextOperatorPayload.operatorAction ?? null,
              nextRedirectTo: nextOperatorPayload.redirectTo ?? null,
            },
          });
          await finalizeOperatorRun({
            runId,
            status: "launched",
            operatorAction: "operator_verified_and_continued",
            message:
              nextOperatorPayload.message ||
              "The operator executed the fix plan, verified the score lift, and continued into the next workflow automatically.",
            redirectTo: nextOperatorPayload.redirectTo || `/scan/${afterScanId}#fix-package`,
            currentStage: "orchestration",
            stageStatus: "completed",
            planId: planPayload.id,
          });
        }

        return NextResponse.json({
          status: "launched",
          operatorAction: "operator_verified_and_continued",
          message:
            nextOperatorPayload.message ||
            "The operator executed the fix plan, verified the score lift, and continued into the next workflow automatically.",
          redirectTo: nextOperatorPayload.redirectTo || `/scan/${afterScanId}#fix-package`,
          planId: planPayload.id,
          runId,
        } satisfies OperatorLaunchResponse);
      }

      if (runId) {
        await appendOperatorRunEvent({
          runId,
          userId: user.id,
          stage: "orchestration",
          status: canContinueOperatorChain ? "info" : "completed",
          title: canContinueOperatorChain ? "Next operator pass deferred" : "Operator chain depth reached",
          detail: canContinueOperatorChain
            ? nextOperatorPayload.error ||
              "Verification succeeded, but the next operator pass did not complete automatically."
            : "Verification succeeded and the operator stopped after the configured chained pass limit for this launch.",
          metadata: {
            afterScanId,
            nextOperatorStatus: nextOperatorRes?.status ?? null,
            chainDepth,
          },
        });
        await finalizeOperatorRun({
          runId,
          status: "launched",
          operatorAction: "operator_verified_fix_plan",
          message: canContinueOperatorChain
            ? nextOperatorPayload.error ||
              "The operator executed the fix plan and verified the result on a fresh scan."
            : "The operator executed the fix plan, verified the result on a fresh scan, and stopped after the chained pass limit.",
          redirectTo: `/scan/${afterScanId}#fix-package`,
          currentStage: "verification",
          stageStatus: "completed",
          planId: planPayload.id,
        });
      }

      return NextResponse.json({
        status: "launched",
        operatorAction: "operator_verified_fix_plan",
        message: canContinueOperatorChain
          ? nextOperatorPayload.error ||
            "The operator executed the fix plan and verified the result on a fresh scan."
          : "The operator executed the fix plan, verified the result on a fresh scan, and stopped after the chained pass limit.",
        redirectTo: `/scan/${afterScanId}#fix-package`,
        planId: planPayload.id,
        runId,
      } satisfies OperatorLaunchResponse);
    }

    const operatorStatus =
      executePayload?.status === "paused" || executePayload?.status === "planning"
        ? "ready"
        : "launched";

    const operatorAction =
      operatorStatus === "ready"
        ? "operator_ready_fix_plan"
        : "operator_launched_fix_plan";

    const operatorMessage =
      operatorStatus === "ready"
        ? "The execution plan is ready and waiting on the next approval checkpoint."
        : "The execution plan is now running through the fix engine.";

    if (runId) {
      await appendOperatorRunEvent({
        runId,
        userId: user.id,
        stage: "execution",
        status: operatorStatus === "ready" ? "completed" : "completed",
        title: operatorStatus === "ready" ? "Execution plan ready" : "Execution launched",
        detail: operatorMessage,
        metadata: {
          planId: planPayload.id,
          planStatus: executePayload?.status,
          progress: executePayload?.progress,
        },
      });
      await finalizeOperatorRun({
        runId,
        status: operatorStatus,
        operatorAction,
        message: operatorMessage,
        redirectTo: `/scan/${latestScan.id}#fix-package`,
        currentStage: "execution",
        stageStatus: operatorStatus === "ready" ? "ready" : "completed",
        planId: planPayload.id,
      });
    }

    return NextResponse.json({
      status: operatorStatus,
      operatorAction,
      message: operatorMessage,
      redirectTo: `/scan/${latestScan.id}#fix-package`,
      planId: planPayload.id,
      runId,
    } satisfies OperatorLaunchResponse);
  } catch (error) {
    console.error("Operator launch error:", error);

    if (runId && userId) {
      await appendOperatorRunEvent({
        runId,
        userId,
        stage: "execution",
        status: "failed",
        title: "Operator run failed",
        detail: error instanceof Error ? error.message : "Unknown operator error",
      }).catch(() => undefined);

      await finalizeOperatorRun({
        runId,
        status: "failed",
        operatorAction: "operator_failed",
        message: error instanceof Error ? error.message : "Operator failed.",
        currentStage: "execution",
        stageStatus: "failed",
      }).catch(() => undefined);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operator failed." },
      { status: 500 }
    );
  }
}
