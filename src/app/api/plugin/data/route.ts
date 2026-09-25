import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashPublicApiKey, hostMatchesAllowedOrigin, normalizeAllowedOrigin } from "@/lib/api-keys";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Embed service is not configured" }, { status: 503 });
  }

  const apiKey = req.nextUrl.searchParams.get("key");
  if (!apiKey || !/^geo_[a-f0-9]{32}$/i.test(apiKey)) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const { data: apiKeyRecord, error: keyError } = await supabase
    .from("public_api_keys")
    .select("id, user_id, permissions, expires_at, allowed_origin")
    .eq("key_hash", hashPublicApiKey(apiKey))
    .eq("active", true)
    .maybeSingle();

  if (keyError) {
    console.error("Embed API key lookup failed", keyError);
    return NextResponse.json({ error: "Unable to verify API key" }, { status: 500 });
  }
  if (!apiKeyRecord || (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) <= new Date())) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  if (!Array.isArray(apiKeyRecord.permissions) || !apiKeyRecord.permissions.includes("read")) {
    return NextResponse.json({ error: "This API key does not have read permission" }, { status: 403 });
  }

  const [{ data: profile, error: profileError }, { data: businessProfile, error: businessError }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("business_name, city, state, website_url")
      .eq("id", apiKeyRecord.user_id)
      .maybeSingle(),
    supabase
      .from("business_profiles")
      .select("business_name, address, city, state, zip, phone, website")
      .eq("user_id", apiKeyRecord.user_id)
      .maybeSingle(),
  ]);

  if (profileError || businessError) {
    console.error("Embed business profile lookup failed", profileError || businessError);
    return NextResponse.json({ error: "Unable to load business profile" }, { status: 500 });
  }
  if (!profile && !businessProfile) {
    return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
  }

  const business = {
    business_name: businessProfile?.business_name || profile?.business_name || "",
    address: businessProfile?.address || "",
    city: businessProfile?.city || profile?.city || "",
    state: businessProfile?.state || profile?.state || "",
    zip: businessProfile?.zip || "",
    phone: businessProfile?.phone || "",
    website_url: businessProfile?.website || profile?.website_url || "",
  };

  const origin = req.headers.get("origin") || "";
  const registeredOrigin = apiKeyRecord.allowed_origin || normalizeAllowedOrigin(business.website_url);
  if (origin && (!registeredOrigin || !hostMatchesAllowedOrigin(origin, registeredOrigin))) {
    return NextResponse.json({ error: "This website is not registered for the API key" }, { status: 403 });
  }
  if (registeredOrigin && !apiKeyRecord.allowed_origin) {
    await supabase.from("public_api_keys").update({ allowed_origin: registeredOrigin }).eq("id", apiKeyRecord.id);
  }
  await supabase.from("public_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKeyRecord.id);

  // Get latest scan data
  const { data: scan } = await supabase
    .from("scans")
    .select("geothority_score, created_at")
    .eq("user_id", apiKeyRecord.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get latest fix package
  const { data: fixPkg } = await supabase
    .from("fix_packages")
    .select("*")
    .eq("user_id", apiKeyRecord.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Build the embed data payload
  const payload = {
    business: {
      name: business.business_name,
      city: business.city,
      state: business.state,
      website: business.website_url,
    },
    schema: buildSchemaMarkup(business),
    faq: buildFaqContent(fixPkg),
    metaTags: buildMetaTags(business, scan),
    trustScore: scan?.geothority_score || null,
    lastScan: scan?.created_at || null,
  };

  // CORS: validate Origin against the user's registered embed domain
  const allowedOrigin = origin && registeredOrigin && hostMatchesAllowedOrigin(origin, registeredOrigin) ? origin : "";
  return NextResponse.json(payload, {
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET",
      "Cache-Control": "private, no-store",
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
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".test") || hostname.endsWith(".local");
  } catch {
    return false;
  }
}

function buildSchemaMarkup(profile: any) {
  return [{
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.business_name,
    address: {
      "@type": "PostalAddress",
      streetAddress: profile.address || undefined,
      addressLocality: profile.city,
      addressRegion: profile.state,
      postalCode: profile.zip || undefined,
      addressCountry: "US",
    },
    url: profile.website_url || undefined,
    ...(profile.phone ? { telephone: profile.phone } : {}),
    sameAs: [],
  }];
}

function buildFaqContent(fixPkg: any) {
  if (!Array.isArray(fixPkg?.fixes)) return null;
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
  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  return {
    title: [profile.business_name, location].filter(Boolean).join(" — "),
    description: `${profile.business_name || "Local business"}${location ? ` serves ${location}` : ""}.`,
  };
}
