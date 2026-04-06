import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * GET /api/gbp/status
 * Returns whether the user has a valid Google provider token
 * and whether they have a synced GBP profile.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { authenticated: false, googleConnected: false, hasSyncedProfile: false },
        { status: 200 }
      );
    }

    const googleConnected = !!session.provider_token;

    // Check for existing GBP profile
    const { data: profile } = await supabase
      .from("gbp_profiles")
      .select("id, last_synced_at, business_name")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      authenticated: true,
      googleConnected,
      hasSyncedProfile: !!profile,
      lastSyncedAt: profile?.last_synced_at || null,
      businessName: profile?.business_name || null,
    });
  } catch (error: any) {
    console.error("GBP status error:", error);
    return NextResponse.json(
      { error: "Failed to check GBP status", message: error.message },
      { status: 500 }
    );
  }
}
