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

    return NextResponse.json(
      { ok: true },
      {
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
