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

  // Mark as published (actual GBP API publish would go here when Google Business API is connected)
  const { data: post, error } = await supabase
    .from("gbp_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  return NextResponse.json({ post });
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
