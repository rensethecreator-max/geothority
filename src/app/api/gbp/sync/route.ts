import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { syncGBPData } from "@/lib/google-business/sync";
import { requirePlan } from "@/lib/plan-gate";
import { getAutomationPolicy, isAutoAllowed } from "@/lib/automation-policies";

/**
 * POST /api/gbp/sync
 * One-click GBP data sync. Requires authenticated user with Google OAuth token.
 * Requires: starter plan or above.
 */
export async function POST(request: NextRequest) {
  try {
    const gate = await requirePlan(request, "starter");
    if (gate.error) return gate.error;
    const supabase = await createServerSupabase();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated", message: "Please sign in to continue." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (body?.isAutoAction) {
      const policy = await getAutomationPolicy(session.user.id, "gbp_actions");
      if (!isAutoAllowed(policy)) {
        return NextResponse.json(
          { error: "Automation policy blocks automatic GBP actions for this account." },
          { status: 403 }
        );
      }
    }

    const accessToken = session.provider_token;
    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Google not connected",
          message:
            "No Google access token found. Please connect your Google Business Profile first by clicking the Connect button.",
        },
        { status: 403 }
      );
    }

    const result = await syncGBPData({
      accessToken,
      userId: session.user.id,
      supabase,
    });

    return NextResponse.json({
      success: true,
      profileId: result.profileId,
      accountName: result.accountName,
      locationName: result.locationName,
      message: "GBP data synced successfully",
    });
  } catch (error: any) {
    console.error("GBP sync error:", error);

    // Provide user-friendly messages for common errors
    let userMessage = error.message || "An unexpected error occurred during sync.";
    let status = 500;

    if (error.message?.includes("401")) {
      userMessage =
        "Your Google session has expired. Please disconnect and reconnect your Google account.";
      status = 401;
    } else if (error.message?.includes("403")) {
      userMessage =
        "Insufficient permissions. Make sure you granted Google Business Profile access during sign-in.";
      status = 403;
    } else if (error.message?.includes("No Google Business accounts")) {
      userMessage =
        "No Google Business Profile accounts were found for your Google account. Make sure you have a Google Business Profile set up.";
      status = 404;
    } else if (error.message?.includes("No locations found")) {
      userMessage =
        "No business locations found in your Google Business Profile account. Add a location in Google Business Profile first.";
      status = 404;
    }

    return NextResponse.json(
      { error: "Sync failed", message: userMessage },
      { status }
    );
  }
}
