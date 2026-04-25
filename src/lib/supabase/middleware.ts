import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isMissingOnboardingColumnError } from "@/lib/supabase/ensure-user-profile";

// All paths that require authentication
const PROTECTED_PATHS = [
  "/dashboard",
  "/scan",
  "/content",
  "/competitors",
  "/settings",
  "/billing",
  "/onboarding",
  "/admin",
  "/google-business",
  "/analytics",
  "/gbp-monitor",
  "/schema-generator",
  "/ai-overview",
];

// Admin-only paths (require ADMIN_EMAILS match)
const ADMIN_PATHS = ["/admin"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Check if path is protected
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const fullRedirect = `${pathname}${request.nextUrl.search}`;
    url.searchParams.set("redirect", fullRedirect);
    return NextResponse.redirect(url);
  }

  // Check admin paths
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  if (isAdminPath && user) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (!adminEmails.includes(user.email ?? "")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from /login or /signup.
  // Preserve a safe relative redirect when one is explicitly requested.
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const requestedRedirect = request.nextUrl.searchParams.get("redirect");
    const nextPath = requestedRedirect && requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = nextPath;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Auto-redirect new authenticated users to /onboarding if not yet completed
  // Only applies to protected app paths (not /onboarding itself, not API routes, not admin)
  const isAppPath = isProtected && !pathname.startsWith("/admin") && !pathname.startsWith("/api");
  if (isAppPath && user && pathname !== "/onboarding" && pathname !== "/billing") {
    try {
      const { data: profileCheck, error: profileError } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      if (profileError && !isMissingOnboardingColumnError(profileError)) {
        throw profileError;
      }

      // Only redirect if profile exists and onboarding is explicitly false
      if (profileCheck && profileCheck.onboarding_completed === false) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    } catch {
      // If profile doesn't exist yet, allow through (will be created on first auth)
    }
  }

  return supabaseResponse;
}
