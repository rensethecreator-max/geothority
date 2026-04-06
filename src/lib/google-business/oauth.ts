// ============================================================
// Google Business Profile — OAuth via Supabase
// ============================================================
import { createClient } from "@/lib/supabase/client"; // uses @supabase/ssr

/**
 * Required Google scopes for GBP access.
 * business.manage gives read/write to the Business Profile API.
 */
const GBP_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
];

/**
 * Initiate Google OAuth sign-in with GBP scopes.
 * Uses Supabase Auth's built-in Google provider + extra scopes.
 * The user's Google OAuth tokens (including provider_token) are
 * stored by Supabase and available via getSession().
 */
export async function signInWithGoogleBusiness() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: GBP_SCOPES.join(" "),
      redirectTo: `${window.location.origin}/api/auth/callback?redirect=/google-business`,
      queryParams: {
        access_type: "offline", // get refresh token
        prompt: "consent",      // ensure we always get refresh token
      },
    },
  });

  if (error) {
    console.error("GBP OAuth error:", error);
    throw error;
  }
  return data;
}

/**
 * Get the current Google access token from Supabase session.
 * Returns null if user hasn't connected Google or token is missing.
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    return null;
  }

  return session.provider_token;
}

/**
 * Check if user has Google Business Profile connected.
 */
export async function isGBPConnected(): Promise<boolean> {
  const token = await getGoogleAccessToken();
  return token !== null;
}
