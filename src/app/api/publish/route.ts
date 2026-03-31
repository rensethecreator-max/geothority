import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contentId, cmsType, cmsCredentials } = await req.json();

    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID is required" },
        { status: 400 }
      );
    }

    // Get content
    const { data: content, error } = await supabase
      .from("generated_content")
      .select("*")
      .eq("id", contentId)
      .eq("user_id", user.id)
      .single();

    if (error || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    let cmsPostId: string | null = null;

    if (cmsType === "wordpress" && cmsCredentials?.siteUrl && cmsCredentials?.username && cmsCredentials?.appPassword) {
      try {
        const wpRes = await fetch(
          `${cmsCredentials.siteUrl}/wp-json/wp/v2/pages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${Buffer.from(
                `${cmsCredentials.username}:${cmsCredentials.appPassword}`
              ).toString("base64")}`,
            },
            body: JSON.stringify({
              title: content.title,
              content: content.content_html,
              status: "publish",
              meta: {
                _yoast_wpseo_metadesc: content.meta_description,
              },
            }),
          }
        );

        if (!wpRes.ok) {
          const wpError = await wpRes.text();
          return NextResponse.json(
            { error: `WordPress publishing failed: ${wpError}` },
            { status: 500 }
          );
        }

        const wpData = await wpRes.json();
        cmsPostId = String(wpData.id);
      } catch (_wpErr) {
        return NextResponse.json(
          { error: "Failed to connect to WordPress" },
          { status: 500 }
        );
      }
    }

    // Update content status
    const { error: updateError } = await supabase
      .from("generated_content")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        cms_post_id: cmsPostId,
      })
      .eq("id", contentId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update content status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cmsPostId,
      publishedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Publish API error:", error);
    return NextResponse.json(
      { error: "Failed to publish content" },
      { status: 500 }
    );
  }
}
