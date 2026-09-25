import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { hashPublicApiKey, normalizeAllowedOrigin } from "@/lib/api-keys";

/**
 * GET /api/settings/api-keys — List user's API keys
 * POST /api/settings/api-keys — Create a new API key
 * DELETE /api/settings/api-keys — Revoke an API key
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: keys, error } = await supabase
      .from("public_api_keys")
      .select("id, key_prefix, name, permissions, last_used_at, expires_at, active, created_at, allowed_origin, embed_installed, embed_last_seen")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("API key list failed", error);
      return NextResponse.json({ error: "Unable to load API keys" }, { status: 500 });
    }

    return NextResponse.json({ keys: keys ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
    }
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 100) return NextResponse.json({ error: "Key name must be between 1 and 100 characters" }, { status: 400 });

    const permissions = Array.isArray(body.permissions)
      ? Array.from(new Set(body.permissions.filter((permission: unknown) => permission === "read" || permission === "write")))
      : ["read"];
    if (!permissions.length) return NextResponse.json({ error: "Select at least one supported permission" }, { status: 400 });
    const allowedOrigin = body.allowedOrigin == null || body.allowedOrigin === ""
      ? null
      : normalizeAllowedOrigin(body.allowedOrigin);
    if (body.allowedOrigin && !allowedOrigin) {
      return NextResponse.json({ error: "Enter a valid HTTPS website domain without a path." }, { status: 400 });
    }

    // Generate a random API key
    const rawKey = `geo_${crypto.randomUUID().replace(/-/g, "")}`;
    const keyPrefix = rawKey.slice(0, 8);

    const { data: createdKey, error } = await supabase
      .from("public_api_keys")
      .insert({
        user_id: session.user.id,
        key_hash: hashPublicApiKey(rawKey),
        key_prefix: keyPrefix,
        name,
        permissions,
        allowed_origin: allowedOrigin,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
    }

    // Return the raw key ONLY on creation — this is the only time it's visible
    return NextResponse.json({
      id: createdKey.id,
      key: rawKey,
      keyPrefix,
      name,
      permissions,
      allowedOrigin,
      warning: "Save this key now. It will not be shown again.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const keyId = body?.keyId;
    if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 });

    const { error } = await supabase
      .from("public_api_keys")
      .update({ active: false })
      .eq("id", keyId)
      .eq("user_id", session.user.id);

    if (error) return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
