import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      contentId,
      cmsType,
      cmsCredentials,
      wpContentType,
      slug,
      verifyAfterPublish,
    } = await req.json();

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

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("cms_type, cms_credentials")
      .eq("id", user.id)
      .single();

    const resolvedCmsType = cmsType || profile?.cms_type || null;
    const resolvedCmsCredentials = cmsCredentials || profile?.cms_credentials || null;
    const resolvedWpContentType =
      wpContentType || resolvedCmsCredentials?.wordpressContentType || "pages";
    const resolvedVerifyAfterPublish =
      typeof verifyAfterPublish === "boolean"
        ? verifyAfterPublish
        : resolvedCmsCredentials?.verifyAfterPublish !== false;
    const resolvedSlug = typeof slug === "string" && slug.trim()
      ? slugify(slug)
      : slugify(content.title || "generated-page");

    if (
      resolvedCmsType !== "wordpress" ||
      !resolvedCmsCredentials?.siteUrl ||
      !resolvedCmsCredentials?.username ||
      !resolvedCmsCredentials?.appPassword
    ) {
      return NextResponse.json(
        { error: "Connect WordPress in Settings before publishing." },
        { status: 400 }
      );
    }

    let cmsPostId: string | null = null;
    let verified = false;
    let liveUrl: string | null = null;

    try {
      const wpEndpoint = resolvedWpContentType === "posts" ? "posts" : "pages";
      const wpRes = await fetch(
        `${resolvedCmsCredentials.siteUrl}/wp-json/wp/v2/${wpEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(
              `${resolvedCmsCredentials.username}:${resolvedCmsCredentials.appPassword}`
            ).toString("base64")}`,
          },
          body: JSON.stringify({
            title: content.title,
            content: content.content_html,
            status: "publish",
            slug: resolvedSlug,
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
      liveUrl = wpData.link || null;

      if (resolvedVerifyAfterPublish && cmsPostId) {
        const verifyRes = await fetch(
          `${resolvedCmsCredentials.siteUrl}/wp-json/wp/v2/${wpEndpoint}/${cmsPostId}`,
          {
            headers: {
              Authorization: `Basic ${Buffer.from(
                `${resolvedCmsCredentials.username}:${resolvedCmsCredentials.appPassword}`
              ).toString("base64")}`,
            },
          }
        );

        verified = verifyRes.ok;
        if (verified) {
          const verifyData = await verifyRes.json().catch(() => null);
          liveUrl = verifyData?.link || liveUrl;
        }
      }
    } catch (_wpErr) {
      return NextResponse.json(
        { error: "Failed to connect to WordPress" },
        { status: 500 }
      );
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
      verified,
      liveUrl,
      wpContentType: resolvedWpContentType,
      slug: resolvedSlug,
    });
  } catch (error) {
    console.error("Publish API error:", error);
    return NextResponse.json(
      { error: "Failed to publish content" },
      { status: 500 }
    );
  }
}
