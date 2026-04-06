// ============================================================
// Google Business Profile — Sync Engine
// Fetches data from Google APIs and stores in Supabase
// ============================================================

import {
  listAccounts,
  listLocations,
  listReviews,
  listMedia,
  listPosts,
  listQuestions,
  starRatingToNumber,
  formatTime,
  type GoogleLocation,
  type GoogleReview,
} from "./api";
import type {
  GBPProfile,
  GBPReview,
  GBPPost,
  GBPQA,
  GBPAuditResult,
  AuditRecommendation,
} from "./types";

interface SyncContext {
  accessToken: string;
  userId: string;
  supabase: any; // SupabaseClient
}

/**
 * Full one-click sync: fetches everything from Google and upserts into Supabase.
 * Returns the GBP profile ID for the synced location.
 */
export async function syncGBPData(ctx: SyncContext): Promise<{
  profileId: string;
  accountName: string;
  locationName: string;
}> {
  const { accessToken, userId, supabase } = ctx;

  // 1. Get accounts
  const accounts = await listAccounts(accessToken);
  if (!accounts.length) throw new Error("No Google Business accounts found.");

  const account = accounts[0]; // Use first account
  const accountName = account.name;

  // 2. Get locations
  const locations = await listLocations(accessToken, accountName);
  if (!locations.length) throw new Error("No locations found in your Google Business account.");

  const location = locations[0]; // Use first location
  const locationName = location.name!;

  // 3. Upsert profile
  const profile = mapLocationToProfile(location, userId, accountName, locationName);

  const { data: existingProfile } = await supabase
    .from("gbp_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("google_location_id", locationName)
    .single();

  let profileId: string;

  if (existingProfile) {
    profileId = existingProfile.id;
    await supabase
      .from("gbp_profiles")
      .update({ ...profile, updated_at: new Date().toISOString(), last_synced_at: new Date().toISOString() })
      .eq("id", profileId);
  } else {
    const { data: newProfile } = await supabase
      .from("gbp_profiles")
      .insert(profile)
      .select("id")
      .single();
    profileId = newProfile!.id;
  }

  // 4. Sync reviews (paginated — fetch all)
  let allReviews: GoogleReview[] = [];
  let pageToken: string | undefined;
  let totalReviewCount = 0;
  let averageRating = 0;

  try {
    do {
      const reviewData = await listReviews(accessToken, accountName, locationName, 50, pageToken);
      allReviews = [...allReviews, ...(reviewData.reviews || [])];
      pageToken = reviewData.nextPageToken;
      totalReviewCount = reviewData.totalReviewCount || allReviews.length;
      averageRating = reviewData.averageRating || 0;
    } while (pageToken);
  } catch (e) {
    console.warn("Could not fetch reviews:", e);
  }

  if (allReviews.length > 0) {
    const reviewRows = allReviews.map((r) => mapReview(r, profileId));

    // Upsert in batches of 50
    for (let i = 0; i < reviewRows.length; i += 50) {
      const batch = reviewRows.slice(i, i + 50);
      await supabase.from("gbp_reviews").upsert(batch, { onConflict: "google_review_id" });
    }
  }

  // 5. Sync media count
  try {
    const media = await listMedia(accessToken, accountName, locationName);
    await supabase
      .from("gbp_profiles")
      .update({
        photo_count: media.length,
        profile_photo_url: media.find((m) => m.locationAssociation?.category === "PROFILE")?.googleUrl || null,
        cover_photo_url: media.find((m) => m.locationAssociation?.category === "COVER")?.googleUrl || null,
      })
      .eq("id", profileId);
  } catch (e) {
    console.warn("Could not fetch media:", e);
  }

  // 6. Sync posts
  try {
    const posts = await listPosts(accessToken, accountName, locationName);
    if (posts.length > 0) {
      const postRows = posts.map((p) => mapPost(p, profileId));
      await supabase.from("gbp_posts").upsert(postRows, { onConflict: "google_post_id" });
    }
  } catch (e) {
    console.warn("Could not fetch posts:", e);
  }

  // 7. Sync Q&A
  try {
    const questions = await listQuestions(accessToken, accountName, locationName);
    if (questions.length > 0) {
      const qaRows = questions.map((q) => mapQuestion(q, profileId));
      await supabase.from("gbp_questions").upsert(qaRows, { onConflict: "google_question_id" });
    }
  } catch (e) {
    console.warn("Could not fetch Q&A:", e);
  }

  // 8. Run audit
  await runGBPAudit(supabase, profileId, userId, totalReviewCount, averageRating);

  return { profileId, accountName, locationName };
}

// ---------- Mappers ----------

function mapLocationToProfile(
  loc: GoogleLocation,
  userId: string,
  accountName: string,
  locationName: string
): Omit<GBPProfile, "id" | "created_at" | "updated_at"> {
  const addr = loc.storefrontAddress;
  const hours = loc.regularHours;

  return {
    user_id: userId,
    google_account_id: accountName,
    google_location_id: locationName,
    business_name: loc.title,
    primary_phone: loc.phoneNumbers?.primaryPhone || null,
    primary_category: loc.categories?.primaryCategory?.displayName || null,
    additional_categories: (loc.categories?.additionalCategories || []).map((c) => c.displayName),
    website_url: loc.websiteUri || null,
    description: loc.profile?.description || null,
    address_line1: addr?.addressLines?.[0] || null,
    address_line2: addr?.addressLines?.[1] || null,
    city: addr?.locality || null,
    state: addr?.administrativeArea || null,
    postal_code: addr?.postalCode || null,
    country: addr?.regionCode || null,
    latitude: loc.latlng?.latitude || null,
    longitude: loc.latlng?.longitude || null,
    verification_status: null, // populated separately via verification API
    is_open: loc.openInfo?.status === "OPEN",
    regular_hours: hours
      ? {
          periods: hours.periods.map((p) => ({
            openDay: p.openDay,
            openTime: formatTime(p.openTime),
            closeDay: p.closeDay,
            closeTime: formatTime(p.closeTime),
          })),
        }
      : null,
    special_hours:
      loc.specialHours?.specialHourPeriods?.map((s) => ({
        startDate: s.startDate,
        openTime: s.openTime ? formatTime(s.openTime) : undefined,
        closeTime: s.closeTime ? formatTime(s.closeTime) : undefined,
        isClosed: s.closed ?? false,
      })) || null,
    profile_photo_url: null,
    cover_photo_url: null,
    photo_count: 0,
    attributes: [],
    service_items:
      loc.serviceItems?.map((si) => ({
        name:
          si.freeFormServiceItem?.label?.displayName ||
          si.structuredServiceItem?.serviceTypeId ||
          "Unknown",
        price: si.price
          ? { currencyCode: si.price.currencyCode, units: si.price.units }
          : undefined,
        description: si.structuredServiceItem?.description,
      })) || [],
    last_synced_at: new Date().toISOString(),
  };
}

function mapReview(r: GoogleReview, profileId: string): Omit<GBPReview, "id"> {
  return {
    gbp_profile_id: profileId,
    google_review_id: r.reviewId || r.name,
    reviewer_name: r.reviewer.displayName,
    reviewer_photo_url: r.reviewer.profilePhotoUrl || null,
    star_rating: starRatingToNumber(r.starRating),
    comment: r.comment || null,
    reply_comment: r.reviewReply?.comment || null,
    reply_updated_at: r.reviewReply?.updateTime || null,
    create_time: r.createTime,
    update_time: r.updateTime,
    synced_at: new Date().toISOString(),
  };
}

function mapPost(p: any, profileId: string) {
  return {
    gbp_profile_id: profileId,
    google_post_id: p.name,
    topic_type: p.topicType || "STANDARD",
    summary: p.summary || null,
    media_url: p.media?.[0]?.sourceUrl || null,
    action_type: p.callToAction?.actionType || null,
    action_url: p.callToAction?.url || null,
    event_start: p.event?.schedule?.startDate ? JSON.stringify(p.event.schedule.startDate) : null,
    event_end: p.event?.schedule?.endDate ? JSON.stringify(p.event.schedule.endDate) : null,
    create_time: p.createTime,
    synced_at: new Date().toISOString(),
  };
}

function mapQuestion(q: any, profileId: string) {
  const topAnswer = q.topAnswers?.[0];
  return {
    gbp_profile_id: profileId,
    google_question_id: q.name,
    question_text: q.text,
    author_name: q.author?.displayName || "Unknown",
    answer_text: topAnswer?.text || null,
    answer_author_name: topAnswer?.author?.displayName || null,
    create_time: q.createTime,
    synced_at: new Date().toISOString(),
  };
}

// ---------- Audit Engine ----------

async function runGBPAudit(
  supabase: any,
  profileId: string,
  userId: string,
  totalReviewCount: number,
  averageRating: number
) {
  // Fetch profile
  const { data: profile } = await supabase
    .from("gbp_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (!profile) return;

  // Fetch reviews for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentReviews } = await supabase
    .from("gbp_reviews")
    .select("*")
    .eq("gbp_profile_id", profileId)
    .gte("create_time", thirtyDaysAgo);

  const { data: allReviews } = await supabase
    .from("gbp_reviews")
    .select("*")
    .eq("gbp_profile_id", profileId);

  const reviews = allReviews || [];
  const recent = recentReviews || [];

  // Fetch posts
  const { data: recentPosts } = await supabase
    .from("gbp_posts")
    .select("*")
    .eq("gbp_profile_id", profileId)
    .gte("create_time", thirtyDaysAgo);

  // Fetch unanswered questions
  const { data: unansweredQs } = await supabase
    .from("gbp_questions")
    .select("*")
    .eq("gbp_profile_id", profileId)
    .is("answer_text", null);

  // Calculate scores
  const has_description = !!profile.description;
  const has_phone = !!profile.primary_phone;
  const has_website = !!profile.website_url;
  const has_hours = !!profile.regular_hours;
  const has_categories = !!profile.primary_category;
  const has_photos = (profile.photo_count || 0) > 0;
  const has_attributes = (profile.attributes || []).length > 0;
  const has_services = (profile.service_items || []).length > 0;

  const completenessFields = [
    has_description,
    has_phone,
    has_website,
    has_hours,
    has_categories,
    has_photos,
    has_attributes,
    has_services,
  ];
  const completeness_score = Math.round(
    (completenessFields.filter(Boolean).length / completenessFields.length) * 100
  );

  // Review health
  const repliedReviews = reviews.filter((r: any) => r.reply_comment);
  const review_response_rate = reviews.length > 0 ? repliedReviews.length / reviews.length : 0;
  const negative_review_count = reviews.filter((r: any) => r.star_rating <= 2).length;
  const avg_rating = averageRating || (reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.star_rating, 0) / reviews.length
    : 0);

  let review_health_score = 0;
  if (reviews.length > 0) {
    const ratingScore = (avg_rating / 5) * 40;
    const responseScore = review_response_rate * 30;
    const velocityScore = Math.min(recent.length / 5, 1) * 20; // 5+ reviews/month = max
    const negativePenalty = Math.min(negative_review_count * 5, 10);
    review_health_score = Math.round(Math.max(0, ratingScore + responseScore + velocityScore - negativePenalty + 10));
  }

  // Engagement
  const posts = recentPosts || [];
  const unanswered = unansweredQs || [];

  let engagement_score = 0;
  const postScore = Math.min(posts.length / 4, 1) * 50; // 4+ posts/month = max
  const qaScore = unanswered.length === 0 ? 30 : Math.max(0, 30 - unanswered.length * 10);
  const photoScore = Math.min((profile.photo_count || 0) / 10, 1) * 20;
  engagement_score = Math.round(postScore + qaScore + photoScore);

  const overall_score = Math.round(
    completeness_score * 0.35 + review_health_score * 0.40 + engagement_score * 0.25
  );

  // Build recommendations
  const recommendations: AuditRecommendation[] = [];

  if (!has_description) {
    recommendations.push({
      category: "completeness",
      priority: "high",
      title: "Add a business description",
      description: "Your GBP listing has no description. Add a compelling 750-character description with your key services and location.",
      impact_label: "+8 completeness points",
    });
  }

  if (!has_hours) {
    recommendations.push({
      category: "completeness",
      priority: "high",
      title: "Set business hours",
      description: "Business hours are missing. Google heavily weighs complete listings—add your operating hours.",
      impact_label: "+8 completeness points",
    });
  }

  if (!has_photos || (profile.photo_count || 0) < 5) {
    recommendations.push({
      category: "photos",
      priority: "medium",
      title: "Add more photos",
      description: `You have ${profile.photo_count || 0} photos. Aim for 10+ quality photos (exterior, interior, team, products/services).`,
      impact_label: "+5-15 engagement points",
    });
  }

  if (review_response_rate < 0.8) {
    recommendations.push({
      category: "reviews",
      priority: "high",
      title: "Respond to more reviews",
      description: `You've responded to ${Math.round(review_response_rate * 100)}% of reviews. Aim for 100%—Google rewards active engagement.`,
      impact_label: "+10-20 review health points",
    });
  }

  if (recent.length < 3) {
    recommendations.push({
      category: "reviews",
      priority: "medium",
      title: "Increase review velocity",
      description: `Only ${recent.length} reviews in the last 30 days. Implement a review request flow to boost velocity.`,
      impact_label: "+5-15 review health points",
    });
  }

  if (posts.length < 2) {
    recommendations.push({
      category: "posts",
      priority: "medium",
      title: "Post more frequently",
      description: `Only ${posts.length} posts in the last 30 days. Aim for 1-2 posts per week to stay active.`,
      impact_label: "+10-20 engagement points",
    });
  }

  if (unanswered.length > 0) {
    recommendations.push({
      category: "engagement",
      priority: "high",
      title: "Answer unanswered questions",
      description: `${unanswered.length} questions on your listing have no answer. Answer them to improve engagement and trust.`,
      impact_label: "+5-15 engagement points",
    });
  }

  if (!has_services) {
    recommendations.push({
      category: "completeness",
      priority: "low",
      title: "Add services/products",
      description: "List your services or products on your GBP. This helps Google understand what you offer.",
      impact_label: "+5 completeness points",
    });
  }

  // Upsert audit result
  const auditRow = {
    gbp_profile_id: profileId,
    user_id: userId,
    completeness_score,
    review_health_score,
    engagement_score,
    overall_score,
    has_description,
    has_phone,
    has_website,
    has_hours,
    has_categories,
    has_photos,
    has_attributes,
    has_services,
    total_reviews: totalReviewCount || reviews.length,
    average_rating: Math.round(avg_rating * 100) / 100,
    reviews_last_30_days: recent.length,
    review_response_rate: Math.round(review_response_rate * 100) / 100,
    avg_response_time_hours: null,
    negative_review_count,
    posts_last_30_days: posts.length,
    questions_unanswered: unanswered.length,
    recommendations,
    created_at: new Date().toISOString(),
  };

  await supabase.from("gbp_audit_results").upsert(auditRow, { onConflict: "gbp_profile_id" });
}
