import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/reputation/request-service";

const ALLOWED_PUBLISH_TARGETS = new Set(["public_profile", "dashboard"]);

async function getSessionUser() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client unavailable" }, { status: 500 });
    }

    const { id } = await params;
    const body = await req.json();
    const approved = Boolean(body.approved);
    const publishedTo = Array.isArray(body.publishedTo)
      ? Array.from(
          new Set(
            body.publishedTo
              .map((value: unknown) => String(value).trim())
              .filter((value) => ALLOWED_PUBLISH_TARGETS.has(value)),
          ),
        )
      : approved
        ? ["public_profile"]
        : [];

    const { data, error } = await supabase
      .from("reputation_proof_assets")
      .update({ approved, published_to: publishedTo })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, snippet, approved, created_at, topic, published_to")
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: "Reputation tables are not installed yet. Run the migration first." }, { status: 412 });
      }
      return NextResponse.json({ error: error.message || "Failed to update proof asset" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Proof asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, asset: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
