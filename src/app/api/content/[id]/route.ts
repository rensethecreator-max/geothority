import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: content, error: contentError }, { data: profile }] = await Promise.all([
      supabase
        .from("generated_content")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("user_profiles")
        .select("cms_type, cms_credentials")
        .eq("id", user.id)
        .single(),
    ]);

    if (contentError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    return NextResponse.json({
      content,
      cms: {
        type: profile?.cms_type ?? null,
        configured:
          Boolean(profile?.cms_type) &&
          Boolean(profile?.cms_credentials && Object.keys(profile.cms_credentials).length > 0),
        wordpressContentType: profile?.cms_credentials?.wordpressContentType === "posts" ? "posts" : "pages",
        autoPublishFixes: Boolean(profile?.cms_credentials?.autoPublishFixes),
        verifyAfterPublish: profile?.cms_credentials?.verifyAfterPublish !== false,
      },
    });
  } catch (error) {
    console.error("Content GET error:", error);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updates = {
      title: typeof body.title === "string" ? body.title : null,
      meta_description: typeof body.meta_description === "string" ? body.meta_description : null,
      content_html: typeof body.content_html === "string" ? body.content_html : null,
      content_markdown: typeof body.content_markdown === "string" ? body.content_markdown : null,
    };

    const { data, error } = await supabase
      .from("generated_content")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
    }

    return NextResponse.json({ content: data });
  } catch (error) {
    console.error("Content PATCH error:", error);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}
