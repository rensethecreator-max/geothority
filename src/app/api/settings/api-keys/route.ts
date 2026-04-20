import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

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

    const { data: keys } = await supabase
      .from("public_api_keys")
      .select("id, key_prefix, name, permissions, last_used_at, expires_at, active, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

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

    const { name, permissions } = await req.json();
    if (!name) return NextResponse.json({ error: "Key name is required" }, { status: 400 });

    // Generate a random API key
    const rawKey = `geo_${crypto.randomUUID().replace(/-/g, "")}`;
    const keyPrefix = rawKey.slice(0, 8);

    // Hash the key for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { error } = await supabase
      .from("public_api_keys")
      .insert({
        user_id: session.user.id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name,
        permissions: permissions || ["read"],
      });

    if (error) {
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
    }

    // Return the raw key ONLY on creation — this is the only time it's visible
    return NextResponse.json({
      key: rawKey,
      keyPrefix,
      name,
      permissions: permissions || ["read"],
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

    const { keyId } = await req.json();
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
