import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { key, install } = await req.json();

    if (!key) {
      return NextResponse.json({ ok: false, error: "Missing key" }, { status: 400 });
    }

    // Update user profile with embed status
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("embed_api_key", key)
      .select("id, embed_domain")
      .single();

    if (profile) {
      await supabase
        .from("user_profiles")
        .update({
          embed_installed: true,
          embed_domain: install?.url,
          embed_last_seen: new Date().toISOString(),
          embed_config: install,
        })
        .eq("id", profile.id);
    }

    // CORS: restrict to the registered embed domain
    const origin = req.headers.get("origin") || "";
    const allowedOrigin = origin && profile?.embed_domain
      ? matchOrigin(origin, profile.embed_domain) ? origin : ""
      : "";
    return NextResponse.json(
      { ok: true },
      {
        headers: { "Access-Control-Allow-Origin": allowedOrigin, "Vary": "Origin" },
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

function matchOrigin(origin: string, embedDomain: string): boolean {
  try {
    const originHost = new URL(origin).hostname;
    const embedHost = new URL(embedDomain).hostname;
    return originHost === embedHost || originHost.endsWith(`.${embedHost}`);
  } catch {
    return false;
  }
}
