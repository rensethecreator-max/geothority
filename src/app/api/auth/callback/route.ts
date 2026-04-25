import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureUserProfileExists } from "@/lib/supabase/ensure-user-profile";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawRedirect = requestUrl.searchParams.get("redirect") || "/dashboard";
  // Prevent open redirect — only allow relative paths
  const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure user profile exists
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const profileSeed = await ensureUserProfileExists(supabase, user);

        if (profileSeed.error) {
          console.error("Failed to ensure user profile during auth callback", {
            userId: user.id,
            message: profileSeed.error.message,
            code: profileSeed.error.code,
            drift: profileSeed.usedFallback ? "missing_onboarding_completed_column" : undefined,
          });
        }
      }

      return NextResponse.redirect(new URL(redirect, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
}
