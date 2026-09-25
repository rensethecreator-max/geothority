import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashPublicApiKey, normalizeAllowedOrigin } from "@/lib/api-keys";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const key = body?.key;
    const install = body?.install;

    if (typeof key !== "string" || !/^geo_[a-f0-9]{32}$/i.test(key)) {
      return NextResponse.json({ ok: false, error: "Missing key" }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Embed service is not configured" }, { status: 503 });
    }

    const { data: keyRecord, error: lookupError } = await supabase
      .from("public_api_keys")
      .select("id, user_id, allowed_origin, expires_at, permissions")
      .eq("key_hash", hashPublicApiKey(key))
      .eq("active", true)
      .maybeSingle();

    if (lookupError) {
      console.error("Embed install profile lookup failed", lookupError);
      return NextResponse.json({ ok: false, error: "Unable to verify embed key" }, { status: 500 });
    }
    if (!keyRecord || (keyRecord.expires_at && new Date(keyRecord.expires_at) <= new Date())) {
      return NextResponse.json({ ok: false, error: "Invalid API key" }, { status: 401 });
    }
    if (!Array.isArray(keyRecord.permissions) || !keyRecord.permissions.includes("read")) {
      return NextResponse.json({ ok: false, error: "This API key does not have read permission" }, { status: 403 });
    }

    let registeredHost = keyRecord.allowed_origin;
    if (!registeredHost) {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("website_url")
        .eq("id", keyRecord.user_id)
        .maybeSingle();
      if (profileError) {
        console.error("Embed install domain lookup failed", profileError);
        return NextResponse.json({ ok: false, error: "Unable to verify registered website" }, { status: 500 });
      }
      registeredHost = normalizeAllowedOrigin(profile?.website_url);
    }

    const origin = req.headers.get("origin") || "";
    const originHost = parseHost(origin);
    const reportedHost = typeof install?.url === "string" ? parseHost(install.url) : null;
    if (!originHost || !reportedHost || !registeredHost
      || originHost !== reportedHost
      || !isSameDomainOrSubdomain(originHost, registeredHost)) {
      return NextResponse.json({ ok: false, error: "Embed origin is not registered for this account" }, { status: 403 });
    }

    const seenAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("public_api_keys")
      .update({
        allowed_origin: registeredHost,
        embed_installed: true,
        embed_last_seen: seenAt,
        embed_config: {
          url: originHost,
          schema: install?.schema === true,
          faq: install?.faq === true,
          meta: install?.meta === true,
        },
        last_used_at: seenAt,
      })
      .eq("id", keyRecord.id)
      .eq("user_id", keyRecord.user_id);
    if (updateError) {
      console.error("Embed install state update failed", updateError);
      return NextResponse.json({ ok: false, error: "Unable to save install status" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true },
      {
        headers: { "Access-Control-Allow-Origin": origin, "Vary": "Origin" },
      }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": origin && !/localhost|127\.0\.0\.1/.test(origin) ? origin : "",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    },
  });
}

function parseHost(value: string): string | null {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const isLocalhost = ["localhost", "127.0.0.1"].includes(url.hostname.toLowerCase());
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && isLocalhost && url.protocol === "http:")) {
      return null;
    }
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isSameDomainOrSubdomain(hostname: string, baseHost: string): boolean {
  return hostname === baseHost || hostname.endsWith(`.${baseHost}`);
}
