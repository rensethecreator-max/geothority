import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isMissingOnboardingColumnError } from "@/lib/supabase/ensure-user-profile";
import { getSafeRedirect } from "@/lib/auth/safe-redirect";

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
  "/action-center",
  "/ai-visibility",
  "/citations",
  "/deep-citations",
  "/expansion",
  "/gbp-health",
  "/gbp-posts",
  "/keyword-research",
  "/nap-push",
  "/reports",
  "/reputation",
  "/serp-features",
  "/trust-score",
];

// Admin-only paths (require ADMIN_EMAILS match)
const ADMIN_PATHS = ["/admin"];
const ONBOARDING_FLOW_PATHS = [
  "/onboarding",
  "/dashboard",
  "/scan",
  "/action-center",
  "/reputation",
  "/gbp-health",
  "/billing",
];

function pathMatches(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

async function inferOnboardingCompletion(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const profileCheck = await supabase
    .from("user_profiles")
    .select("onboarding_completed, business_name, city, state")
    .eq("id", userId)
    .maybeSingle();

  if (!profileCheck.error) {
    return {
      completed: profileCheck.data?.onboarding_completed === true,
      drifted: false,
    };
  }

  if (!isMissingOnboardingColumnError(profileCheck.error)) {
    throw profileCheck.error;
  }

  const [fallbackProfile, scanCountResult] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("business_name, city, state")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const hasBusinessContext = Boolean(
    fallbackProfile.data?.business_name
    && fallbackProfile.data?.city
    && fallbackProfile.data?.state,
  );
  const hasScanHistory = (scanCountResult.count ?? 0) > 0;

  return {
    completed: hasBusinessContext && hasScanHistory,
    drifted: true,
  };
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (!pathMatches(pathname, PROTECTED_PATHS)) return supabaseResponse;

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

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

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) user = data.user;
  } catch {
    // Treat auth-service failures as unauthenticated and protect app routes below.
  }

  // Check if path is protected
  const isProtected = pathMatches(pathname, PROTECTED_PATHS);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const fullRedirect = `${pathname}${request.nextUrl.search}`;
    url.searchParams.set("redirect", fullRedirect);
    return NextResponse.redirect(url);
  }

  // Check admin paths
  const isAdminPath = pathMatches(pathname, ADMIN_PATHS);
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
    const nextPath = getSafeRedirect(request.nextUrl.searchParams.get("redirect"));
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
      const onboardingState = await inferOnboardingCompletion(supabase, user.id);
      const allowedDuringOnboarding = pathMatches(pathname, ONBOARDING_FLOW_PATHS);
      const shouldForceOnboardingLanding = pathname === "/dashboard";

      if (!onboardingState.completed && (shouldForceOnboardingLanding || !allowedDuringOnboarding)) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        if (onboardingState.drifted) {
          url.searchParams.set("drift", "missing_onboarding_completed_column");
        }
        return NextResponse.redirect(url);
      }
    } catch {
      // If profile doesn't exist yet, allow through (will be created on first auth)
    }
  }

  return supabaseResponse;
}
