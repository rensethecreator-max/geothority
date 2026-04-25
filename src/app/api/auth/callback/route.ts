import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureUserProfileExists } from "@/lib/supabase/ensure-user-profile";
import type { EmailOtpType } from "@supabase/supabase-js";

const EMAIL_OTP_TYPES: EmailOtpType[] = ["signup", "magiclink", "invite", "recovery", "email_change", "email"];

function getSafeRedirect(rawRedirect?: string | null) {
  return rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
    ? rawRedirect
    : "/dashboard";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type");
  const redirect = getSafeRedirect(requestUrl.searchParams.get("redirect") || "/dashboard");

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

  let authError: { message?: string | null } | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else if (tokenHash && otpType && EMAIL_OTP_TYPES.includes(otpType as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    });
    authError = error;
  } else {
    authError = { message: "Missing auth code" };
  }

  if (!authError) {
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

  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("error", "auth");
  loginUrl.searchParams.set("redirect", redirect);
  return NextResponse.redirect(loginUrl);
}
