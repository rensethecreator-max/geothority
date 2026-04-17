import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Uses service role to look up user by API key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const apiKey = req.nextUrl.searchParams.get("key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  // Look up user by embed API key
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("embed_api_key", apiKey)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Get latest scan data
  const { data: scan } = await supabase
    .from("scans")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get latest fix package
  const { data: fixPkg } = await supabase
    .from("fix_packages")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Build the embed data payload
  const payload = {
    business: {
      name: profile.business_name,
      city: profile.city,
      state: profile.state,
      website: profile.website_url,
    },
    schema: buildSchemaMarkup(profile, scan),
    faq: buildFaqContent(fixPkg),
    metaTags: buildMetaTags(profile, scan),
    trustScore: scan?.geothority_score || null,
    lastScan: scan?.created_at || null,
  };

  // CORS: validate Origin against the user's registered embed domain
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = getAllowedOrigin(origin, profile.embed_domain);
  return NextResponse.json(payload, {
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Vary": "Origin",
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  // Preflight: reflect origin only if it looks like a real customer domain
  const allowedOrigin = origin && !isLocalhost(origin) ? origin : "";
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin || "null",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    },
  });
}

function isLocalhost(origin: string): boolean {
  return /localhost|127\.0\.0\.1|\.test$|\.local$/.test(origin);
}

function getAllowedOrigin(origin: string, embedDomain: string | null): string {
  if (!origin) return "";
  // In development, allow localhost
  if (process.env.NODE_ENV !== "production" && isLocalhost(origin)) return origin;
  // If the origin matches the registered embed domain, allow it
  if (embedDomain) {
    try {
      const embedHost = new URL(embedDomain).hostname;
      const originHost = new URL(origin).hostname;
      if (originHost === embedHost || originHost.endsWith(`.${embedHost}`)) return origin;
    } catch {}
  }
  // Fallback: allow the Geothority app domain itself
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      if (new URL(origin).hostname === new URL(siteUrl).hostname) return origin;
    } catch {}
  }
  return "";
}

function buildSchemaMarkup(profile: any, scan: any) {
  const schemas = [];

  // LocalBusiness / InsuranceAgency schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "InsuranceAgency",
    name: profile.business_name,
    address: {
      "@type": "PostalAddress",
      addressLocality: profile.city,
      addressRegion: profile.state,
      addressCountry: "US",
    },
    url: profile.website_url,
    ...(profile.phone ? { telephone: profile.phone } : {}),
    ...(scan?.geothority_score
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (scan.geothority_score / 20).toFixed(1),
            bestRating: "5",
            worstRating: "1",
            ratingCount: "1",
          },
        }
      : {}),
    sameAs: [],
  });

  // Organization schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: profile.business_name,
    url: profile.website_url,
  });

  return schemas;
}

function buildFaqContent(fixPkg: any) {
  if (!fixPkg?.fixes) return null;
  const faqFix = fixPkg.fixes.find(
    (f: any) => f.type === "faq" || f.type === "ai_optimization"
  );
  if (!faqFix) return null;

  // Parse FAQ content from fix package
  try {
    const content = JSON.parse(faqFix.content);
    return content.faqs || content;
  } catch {
    return null;
  }
}

function buildMetaTags(profile: any, scan: any) {
  return {
    title: `${profile.business_name} — ${profile.city}, ${profile.state}`,
    description: `${profile.business_name} serves ${profile.city}, ${profile.state}. Trust Stack Score: ${scan?.geothority_score || "N/A"}/100.`,
  };
}
