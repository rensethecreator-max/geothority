import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/plan-gate";
import { getAutomationPolicy, isAutoAllowed } from "@/lib/automation-policies";

/**
 * GET /api/gbp/posts — List GBP post suggestions and history
 * POST /api/gbp/posts — Generate new post suggestions
 */

const POST_TEMPLATES = [
  {
    category: "seasonal",
    prompts: [
      { title: "Spring Home Prep", body: "Spring is here! 🌸 Is your home ready? Contact us for a free consultation on {service} in {city}. Our team is standing by to help you protect what matters most.", cta: "BOOK", reason: "Seasonal relevance — spring service push" },
      { title: "Summer Preparedness", body: "Summer is coming to {city}! ☀️ Make sure your {service} is ready for the heat. Book your appointment today and stay ahead of the season.", cta: "BOOK", reason: "Seasonal relevance — summer readiness" },
      { title: "Fall Maintenance Reminder", body: "Don't wait until the first freeze! 🍂 Schedule your fall {service} checkup in {city} now. Early preparation saves money and stress.", cta: "BOOK", reason: "Seasonal relevance — fall preparation" },
      { title: "Winter Readiness", body: "Winter is on the way to {city}! ❄️ Is your {service} winter-ready? Don't get caught unprepared — schedule your inspection today.", cta: "BOOK", reason: "Seasonal relevance — winter preparation" },
    ],
  },
  {
    category: "educational",
    prompts: [
      { title: "5 Things Most People Don't Know About {service}", body: "Did you know? Here are 5 surprising facts about {service} that could save you time and money in {city}:\n\n1. Regular maintenance extends lifespan by 40%\n2. Small issues become big problems fast\n3. Professional checks catch 90% of hidden damage\n4. Seasonal prep reduces emergency calls\n5. Local expertise matters — we know {city}\n\nWant to learn more? Reach out today.", cta: "LEARN_MORE", reason: "Educational content builds authority" },
      { title: "How to Choose the Right {service} Provider", body: "Choosing a {service} provider in {city}? Here's what to look for:\n\n✅ Licensed and insured\n✅ Local reviews and reputation\n✅ Transparent pricing\n✅ Responsive communication\n✅ Industry certifications\n\nWe check all those boxes. See why your neighbors trust us.", cta: "LEARN_MORE", reason: "Trust-building educational content" },
    ],
  },
  {
    category: "promotional",
    prompts: [
      { title: "New Customer Special in {city}", body: "First time working with us? 🎉 Welcome! {city} residents get a special introductory rate on {service}. Don't miss out — this offer won't last.", cta: "BOOK", reason: "New customer acquisition" },
      { title: "Refer a Friend Program", body: "Love our service? Share the love! 👥 Refer a friend in {city} and you BOTH get a discount on your next {service}. It's our way of saying thanks.", cta: "SIGN_UP", reason: "Referral marketing for growth" },
    ],
  },
  {
    category: "community",
    prompts: [
      { title: "Proud to Serve {city}", body: "We've been serving {city} and surrounding areas for years. 🏡 We're not just a business — we're your neighbors. Thank you for trusting us with your {service} needs.", cta: "LEARN_MORE", reason: "Community connection and local trust signals" },
      { title: "Local Event Support", body: "We love supporting our {city} community! 🤝 From local events to neighborhood initiatives, we believe in giving back. See what we've been up to.", cta: "LEARN_MORE", reason: "Community involvement boosts local trust" },
    ],
  },
];

function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`);
}

function getSeasonalCategory(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const status = req.nextUrl.searchParams.get("status");
    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "20"));

    let query = supabase
      .from("gbp_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: posts, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
    }

    // Also get templates
    const { data: templates } = await supabase
      .from("gbp_post_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Summary
    const allPosts = posts ?? [];
    const summary = {
      total: allPosts.length,
      drafts: allPosts.filter(p => p.status === "draft").length,
      pendingApproval: allPosts.filter(p => p.status === "pending_approval").length,
      published: allPosts.filter(p => p.status === "published").length,
      failed: allPosts.filter(p => p.status === "failed").length,
    };

    return NextResponse.json({
      posts: allPosts,
      templates: templates ?? [],
      summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requirePlan(req, "growth");
    if (gate.error) return gate.error;
    const user = gate.user;
    const supabase = await createServerSupabase();

    const body = await req.json();
    const { action = "generate", ...params } = body;

    if (action === "generate") {
      return await generateSuggestions(supabase, user.id, params);
    } else if (action === "approve") {
      return await approvePost(supabase, user.id, params);
    } else if (action === "publish") {
      return await publishPost(supabase, user.id, params);
    } else if (action === "create") {
      return await createPost(supabase, user.id, params);
    } else if (action === "delete") {
      return await deletePost(supabase, user.id, params);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function generateSuggestions(supabase: any, userId: string, params: Record<string, any>) {
  // Get user's business context
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("business_name, city, state, primary_category")
    .eq("user_id", userId)
    .single();

  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("business_name, city, state")
    .eq("id", userId)
    .single();

  const { data: latestScan } = await supabase
    .from("scans")
    .select("business_name, city, state")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const businessName = profile?.business_name || userProfile?.business_name || latestScan?.business_name || "Your Business";
  const city = profile?.city || userProfile?.city || latestScan?.city || "your area";
  const service = profile?.primary_category || "our services";

  const vars = { service, city, business: businessName };

  // Generate 4 diverse suggestions
  const suggestions = [];
  const seasonal = getSeasonalCategory();

  for (const group of POST_TEMPLATES) {
    // Pick 1 from each category
    const template = group.prompts[Math.floor(Math.random() * group.prompts.length)];
    suggestions.push({
      title: fillTemplate(template.title, vars),
      body: fillTemplate(template.body, vars),
      ctaType: template.cta,
      suggestionReason: template.reason,
      postType: "standard" as const,
      category: group.category,
      autoGenerated: true,
      businessContext: vars,
    });
  }

  // Save as drafts
  const rows = suggestions.map(s => ({
    user_id: userId,
    title: s.title,
    body: s.body,
    cta_type: s.ctaType,
    post_type: s.postType,
    suggestion_reason: s.suggestionReason,
    business_context: s.businessContext,
    status: "draft",
    auto_generated: true,
    scheduled_for: params.scheduledFor || null,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const { data: inserted, error } = await supabase
    .from("gbp_posts")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: "Failed to save suggestions", details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    suggestions: inserted,
    generated: inserted?.length ?? 0,
    message: `Generated ${inserted?.length ?? 0} post suggestions`,
  });
}

async function approvePost(supabase: any, userId: string, params: Record<string, any>) {
  const { postId } = params;
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  const { data: post, error } = await supabase
    .from("gbp_posts")
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  return NextResponse.json({ post });
}

async function publishPost(supabase: any, userId: string, params: Record<string, any>) {
  const { postId } = params;
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  // Check automation policy
  const policy = await getAutomationPolicy(userId, "gbp_actions");
  if (!isAutoAllowed(policy)) {
    // Must be approved first
    const { data: post } = await supabase
      .from("gbp_posts")
      .select("status")
      .eq("id", postId)
      .eq("user_id", userId)
      .single();

    if (post?.status !== "approved") {
      return NextResponse.json(
        { error: "Post must be approved before publishing (automation policy requires approval for GBP actions)" },
        { status: 403 }
      );
    }
  }

  // Get the post data
  const { data: postData } = await supabase
    .from("gbp_posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", userId)
    .single();

  // Try to publish via Google Business Profile API
  let publishedToGoogle = false;
  let googleError: string | null = null;

  try {
    // Check for OAuth token
    const { data: gbpConnection } = await supabase
      .from("gbp_connections")
      .select("access_token, refresh_token, token_expiry, account_id")
      .eq("user_id", userId)
      .eq("status", "connected")
      .single();

    if (gbpConnection?.access_token) {
      // Check if token needs refresh
      let accessToken = gbpConnection.access_token;
      const isExpired = gbpConnection.token_expiry && new Date(gbpConnection.token_expiry) < new Date();

      if (isExpired && gbpConnection.refresh_token) {
        try {
          const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              refresh_token: gbpConnection.refresh_token,
              grant_type: "refresh_token",
            }),
          });
          const refreshData = await refreshRes.json();
          if (refreshData.access_token) {
            accessToken = refreshData.access_token;
            // Update stored token
            await supabase
              .from("gbp_connections")
              .update({
                access_token: accessToken,
                token_expiry: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
              })
              .eq("user_id", userId);
          }
        } catch (refreshErr) {
          console.error("[gbp/publish] Token refresh failed:", refreshErr);
          googleError = "OAuth token refresh failed";
        }
      }

      if (accessToken && !googleError && gbpConnection.account_id) {
        // Get the location for this account
        const locationsRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${gbpConnection.account_id}/locations`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const locationsData = await locationsRes.json();
        const location = locationsData?.locations?.[0];

        if (location?.name) {
          // Create the local post via Google Business Profile API
          const postPayload: Record<string, any> = {
            languageCode: "en",
            summary: postData?.body || postData?.content || "",
          };

          if (postData?.title) {
            postPayload.title = postData.title;
          }

          // Add CTA if specified
          if (postData?.cta_type || postData?.cta_url) {
            postPayload.callToAction = {
              actionType: (postData.cta_type || "LEARN_MORE").toUpperCase(),
              url: postData.cta_url || "",
            };
          }

          const publishRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${location.name}/localPosts`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(postPayload),
            }
          );

          if (publishRes.ok) {
            publishedToGoogle = true;
          } else {
            const errData = await publishRes.json().catch(() => ({}));
            googleError = errData?.error?.message || `Google API returned ${publishRes.status}`;
            console.error("[gbp/publish] Google API error:", errData);
          }
        } else {
          googleError = "No GBP location found for this account";
        }
      }
    }
  } catch (err) {
    googleError = `GBP API error: ${String(err)}`;
    console.error("[gbp/publish] Error:", err);
  }

  // Update post status in database
  const updateData: Record<string, any> = {
    status: publishedToGoogle ? "published" : "published_local",
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (publishedToGoogle) {
    updateData.google_published = true;
  }
  if (googleError) {
    updateData.publish_error = googleError;
  }

  const { data: post, error } = await supabase
    .from("gbp_posts")
    .update(updateData)
    .eq("id", postId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to publish" }, { status: 500 });

  return NextResponse.json({
    post,
    publishedToGoogle,
    ...(googleError && !publishedToGoogle ? { warning: `Saved locally but not published to Google: ${googleError}` } : {}),
    ...(publishedToGoogle ? { message: "Post published to Google Business Profile" } : { message: "Post saved locally. Connect your Google Business Profile to publish directly." }),
  });
}

async function createPost(supabase: any, userId: string, params: Record<string, any>) {
  const { title, body: postBody, ctaType, ctaUrl, imageUrl, postType } = params;
  if (!postBody) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const { data: post, error } = await supabase
    .from("gbp_posts")
    .insert({
      user_id: userId,
      title,
      body: postBody,
      cta_type: ctaType,
      cta_url: ctaUrl,
      image_url: imageUrl,
      post_type: postType || "standard",
      status: "draft",
      auto_generated: false,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  return NextResponse.json({ post });
}

async function deletePost(supabase: any, userId: string, params: Record<string, any>) {
  const { postId } = params;
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  const { error } = await supabase
    .from("gbp_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  return NextResponse.json({ success: true });
}
