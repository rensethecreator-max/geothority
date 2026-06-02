import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  detectProfileChanges,
  calculatePhotoFreshnessScore,
  changeToNotification,
  type ProfileAttributeSnapshot,
} from "@/lib/competitor-change-detection";
import { sendCompetitorAlerts } from "@/lib/email-alerts";
import { getAppUrl } from "@/lib/app-url";

/**
 * GET /api/cron/competitor-monitoring
 *
 * Periodic cron job that rescans competitors for all users with active
 * competitor tracking, detects significant metric changes between
 * snapshots, and generates in-app notifications.
 *
 * Auth: CRON_SECRET via Authorization header.
 * Schedule: Every 24h (or whatever schedule your Railway/external cron runner uses).
 */

// ── Types ──────────────────────────────────────────────────────────

type CompetitorAlert = {
  type: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  detectedAt: string;
  isNew?: boolean;
  delta?: string;
};

type SnapshotRow = {
  id: string;
  competitor_id: string;
  rating: number | null;
  review_count: number;
  score: number;
  rank_position: number;
  alerts: CompetitorAlert[];
  snapshot_date: string;
  created_at: string;
  // ── Enhanced profile attributes ──
  photo_count: number | null;
  latest_photo_date: string | null;
  photo_freshness_score: number | null;
  categories: string[] | null;
  primary_category: string | null;
  hours_json: any | null;
  services: string[] | null;
  posts_count: number | null;
  has_description: boolean | null;
  has_website: boolean | null;
  attributes: Record<string, any> | null;
};

type CompetitorRow = {
  id: string;
  user_id: string;
  place_id: string;
  business_name: string;
  domain: string;
  city: string;
  address: string | null;
  rank_position: number;
  last_checked: string | null;
  active: boolean;
};

type SnapshotPersistRow = {
  user_id: string;
  competitor_id: string;
  place_id: string;
  rating: number | null;
  review_count: number;
  score: number;
  rank_position: number;
  alerts: CompetitorAlert[];
  snapshot_source: string;
  snapshot_date: string;
  photo_count?: number | null;
  latest_photo_date?: string | null;
  photo_freshness_score?: number | null;
  categories?: string[] | null;
  primary_category?: string | null;
  hours_json?: any | null;
  services?: string[] | null;
  posts_count?: number | null;
  has_description?: boolean | null;
  has_website?: boolean | null;
  attributes?: Record<string, any> | null;
};

type UserContext = {
  userId: string;
  email: string | null;
  businessName: string | null;
  businessType: string | null;
  location: string | null;
  userScore: number | null;
};

function isSchemaDriftError(error: any) {
  return error?.code === "42P01"
    || error?.code === "42703"
    || error?.code === "PGRST205"
    || error?.code === "PGRST204"
    || /relation .* does not exist/i.test(error?.message || "")
    || /Could not find the table .* in the schema cache/i.test(error?.message || "")
    || /Could not find the '.*' column of '.*' in the schema cache/i.test(error?.message || "")
    || /column .* does not exist/i.test(error?.message || "");
}

// ── Main handler ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const appUrl = getAppUrl();

  const startedAt = new Date().toISOString();
  console.log(`[cron/competitor-monitoring] Starting at ${startedAt}`);

  try {
    // ── 1. Find users with active competitor monitoring ────────────
    const { data: activeCompetitors, error: compError } = await supabase
      .from("competitors")
      .select("id, user_id, place_id, business_name, domain, city, address, rank_position, last_checked, active")
      .eq("active", true);

    if (compError) {
      if (isSchemaDriftError(compError)) {
        console.warn("[cron/competitor-monitoring] Skipping: competitors table/schema not available yet.", compError);
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: "schema_not_ready",
          usersProcessed: 0,
          notificationsCreated: 0,
        });
      }
      console.error("[cron/competitor-monitoring] Error fetching competitors:", compError);
      return NextResponse.json({ error: "DB error fetching competitors" }, { status: 500 });
    }

    if (!activeCompetitors || activeCompetitors.length === 0) {
      console.log("[cron/competitor-monitoring] No active competitors found. Done.");
      return NextResponse.json({ success: true, usersProcessed: 0, notificationsCreated: 0 });
    }

    // Group by user
    const userCompetitorMap = new Map<string, CompetitorRow[]>();
    for (const comp of activeCompetitors as CompetitorRow[]) {
      const list = userCompetitorMap.get(comp.user_id) || [];
      list.push(comp);
      userCompetitorMap.set(comp.user_id, list);
    }

    // ── 2. Create scheduled_task records for this run ──────────────
    const taskRows = Array.from(userCompetitorMap.keys()).map((userId) => ({
      user_id: userId,
      task_type: "competitor_rescan",
      status: "running",
      priority: 5,
      scheduled_at: startedAt,
    }));

    const { data: tasks, error: taskInsertError } = await supabase
      .from("scheduled_tasks")
      .insert(taskRows)
      .select("id, user_id");

    if (taskInsertError) {
      console.error("[cron/competitor-monitoring] Error creating scheduled_tasks:", taskInsertError);
      // Continue even if task tracking fails — monitoring is the priority
    }

    const taskByUser = new Map<string, string>();
    for (const t of tasks || []) {
      taskByUser.set(t.user_id, t.id);
    }

    // ── 3. Process each user ──────────────────────────────────────
    let usersProcessed = 0;
    let notificationsCreated = 0;
    let errors: string[] = [];

    for (const [userId, competitors] of Array.from(userCompetitorMap.entries())) {
      try {
        // Get user context (business type, location for API queries)
        const userCtx = await getUserContext(supabase, userId);
        if (!userCtx.businessType || !userCtx.location) {
          console.log(`[cron/competitor-monitoring] Skipping user ${userId}: missing business context`);
          continue;
        }

        // ── 3a. Rescan via Google Places API ───────────────────────
        let newSnapshots: Array<{
          competitorId: string;
          placeId: string;
          rating: number | null;
          reviewCount: number;
          score: number;
          rankPosition: number;
          alerts: CompetitorAlert[];
        }> = [];

        if (apiKey) {
          newSnapshots = await rescanCompetitors(
            supabase, userId, competitors, userCtx, apiKey
          ) as any[];
        } else {
          // No API key — process existing snapshots for change detection
          console.log("[cron/competitor-monitoring] No Google Maps API key, processing existing snapshots only");
        }

        // ── 3b. Fetch previous snapshots for change detection ──────
        const previousSnapshots = await fetchPreviousSnapshots(supabase, userId);

        // ── 3c. Persist new snapshots ───────────────────────────────
        if (newSnapshots.length > 0) {
          await persistSnapshots(supabase, userId, newSnapshots);
        }

        // ── 3d. Re-fetch snapshots (includes just-persisted ones) ──
        const freshSnapshots = await fetchPreviousSnapshots(supabase, userId);

        // ── 3e. Detect changes and generate notifications ───────────
        const allDetectedChanges: Array<{ title: string; description: string; severity: string }> = [];

        for (const comp of competitors) {
          const snapData = freshSnapshots[comp.id];
          if (!snapData?.latest || !snapData?.previous) continue;

          // Existing metric-based change detection
          const detectedChanges = detectSignificantChanges(
            comp.business_name,
            snapData.latest,
            snapData.previous
          );

          // ── Enhanced profile attribute change detection ────────────
          const profileChanges = detectProfileChanges(
            comp.business_name,
            snapshotToProfileAttrs(snapData.latest),
            snapshotToProfileAttrs(snapData.previous)
          );

          // Log profile attribute changes to dedicated table
          for (const pc of profileChanges) {
            try {
              await supabase.from("competitor_attribute_changes").insert({
                user_id: userId,
                competitor_id: comp.id,
                snapshot_before: snapData.previous.id,
                snapshot_after: snapData.latest.id,
                change_type: pc.changeType,
                change_label: pc.changeLabel,
                change_detail: pc.changeDetail,
                severity: pc.severity,
              });
            } catch (logErr) {
              console.error(`[cron/competitor-monitoring] Failed to log attribute change:`, logErr);
            }

            // Also create notifications for warning/critical profile changes
            if (pc.severity === "warning" || pc.severity === "critical") {
              detectedChanges.push(changeToNotification(pc, comp.business_name));
            }
          }

          for (const change of detectedChanges) {
            allDetectedChanges.push({ title: change.title, description: change.description, severity: change.severity || "info" });
            try {
              const { error: notifError } = await supabase.from("notifications").insert({
                user_id: userId,
                type: change.severity === "critical" ? "error" : change.severity === "warning" ? "warning" : "info",
                title: change.title,
                message: change.description,
                link: `${appUrl}/competitors`,
                read: false,
              });

              if (notifError) {
                console.error(`[cron/competitor-monitoring] Notification insert error:`, notifError);
              } else {
                notificationsCreated++;
              }
            } catch (notifErr) {
              errors.push(`Notification failed for user ${userId}: ${String(notifErr)}`);
            }
          }
        }

        // Send email alerts for detected changes (batched across all competitors)
        if (allDetectedChanges.length > 0 && userCtx.email) {
          await sendCompetitorAlerts(
            userCtx.email,
            userCtx.businessName || "Your Business",
            allDetectedChanges
          );
        }

        usersProcessed++;
      } catch (userErr) {
        const msg = `Error processing user ${userId}: ${String(userErr)}`;
        console.error(`[cron/competitor-monitoring] ${msg}`);
        errors.push(msg);
      }
    }

    // ── 4. Update scheduled_task records ───────────────────────────
    for (const [userId, taskId] of Array.from(taskByUser.entries())) {
      const userErrors = errors.filter((e) => e.includes(userId));
      await supabase
        .from("scheduled_tasks")
        .update({
          status: userErrors.length > 0 ? "failed" : "completed",
          executed_at: new Date().toISOString(),
          result: userErrors.length > 0 ? `Errors: ${userErrors.length}` : "Success",
          error_message: userErrors.length > 0 ? userErrors.join("; ") : null,
        })
        .eq("id", taskId);
    }

    // ── 5. Schedule next run (create pending task for each user) ───
    const nextRunDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const nextRunRows = Array.from(userCompetitorMap.keys()).map((userId) => ({
      user_id: userId,
      task_type: "competitor_rescan",
      status: "pending",
      priority: 5,
      scheduled_at: nextRunDate,
    }));

    await supabase.from("scheduled_tasks").insert(nextRunRows);

    console.log(
      `[cron/competitor-monitoring] Done. Users: ${usersProcessed}, Notifications: ${notificationsCreated}`
    );

    return NextResponse.json({
      success: true,
      usersProcessed,
      notificationsCreated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[cron/competitor-monitoring] Fatal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

async function getUserContext(
  supabase: any,
  userId: string
): Promise<UserContext> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("business_name, city, state, website_url")
    .eq("id", userId)
    .single();

  const { data: latestScan } = await supabase
    .from("scans")
    .select("business_name, city, state, geothority_score, raw_scan_data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const businessName = latestScan?.business_name || profile?.business_name || null;
  const city = latestScan?.city || profile?.city || null;
  const state = latestScan?.state || profile?.state || null;
  const location = city ? `${city}${state ? `, ${state}` : ""}` : null;
  const businessType = inferBusinessType({
    businessName,
    websiteUrl: profile?.website_url,
    title: latestScan?.raw_scan_data?.title,
    description: latestScan?.raw_scan_data?.description,
  });

  // Get user email for alert emails
  let email: string | null = null;
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: authData } = await adminClient.auth.admin.getUserById(userId);
    email = authData?.user?.email ?? null;
  } catch {
    // Service role may not be available
  }

  return {
    userId,
    email,
    businessName,
    businessType,
    location,
    userScore: latestScan?.geothority_score || null,
  };
}

function inferBusinessType(input: {
  businessName?: string | null;
  websiteUrl?: string | null;
  title?: string | null;
  description?: string | null;
}): string | null {
  const haystack = [input.businessName, input.websiteUrl, input.title, input.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const keywords: Array<[RegExp, string]> = [
    [/insurance|agency|broker|coverage/, "insurance agent"],
    [/law|attorney|legal/, "law firm"],
    [/dentist|dental|orthodont/, "dentist"],
    [/roofer|roofing/, "roofing contractor"],
    [/plumb|plumbing/, "plumber"],
    [/hvac|heating|cooling|air conditioning/, "hvac contractor"],
    [/real estate|realtor|brokerage/, "real estate agency"],
    [/medspa|spa|aesthetics/, "med spa"],
  ];

  for (const [pattern, label] of keywords) {
    if (pattern.test(haystack)) return label;
  }

  return haystack ? "local business" : null;
}

async function rescanCompetitors(
  supabase: any,
  userId: string,
  existingCompetitors: CompetitorRow[],
  userCtx: UserContext,
  apiKey: string
): Promise<Array<Record<string, any>>> {
  const query = `${userCtx.businessType} ${userCtx.location}`;
  const searchRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`,
    { signal: AbortSignal.timeout(15000), cache: "no-store" }
  );
  const searchData = await searchRes.json();

  if (!searchData.results || searchData.results.length === 0) {
    console.log(`[cron/competitor-monitoring] No results for query: ${query}`);
    return [];
  }

  // Map existing competitors by place_id for quick lookup
  const compByPlaceId = new Map<string, CompetitorRow>();
  for (const c of existingCompetitors) {
    if (c.place_id) compByPlaceId.set(c.place_id, c);
  }

  // Also track the user's own business (to compute relative metrics)
  const normalizedUserBiz = userCtx.businessName?.toLowerCase().trim();
  const userPlace = normalizedUserBiz
    ? searchData.results.find((p: any) => p.name?.toLowerCase().includes(normalizedUserBiz))
    : null;
  const userRating = userPlace?.rating || null;
  const userReviewCount = userPlace?.user_ratings_total || 0;

  const results: Array<Record<string, any>> = [];

  const filtered = searchData.results
    .filter((p: any) => !normalizedUserBiz || !p.name?.toLowerCase().includes(normalizedUserBiz))
    .slice(0, 10);

  for (let index = 0; index < filtered.length; index++) {
    const p = filtered[index];
    const existing = compByPlaceId.get(p.place_id);

    // If no existing competitor row for this place_id, create one
    let competitorId: string;
    if (existing) {
      competitorId = existing.id;
    } else {
      // Insert new competitor
      const domain = (p.name || "competitor")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const { data: inserted, error: insertErr } = await supabase
        .from("competitors")
        .insert({
          user_id: userId,
          place_id: p.place_id,
          domain: `${domain || "competitor"}.com`,
          business_name: p.name,
          city: userCtx.location,
          address: p.formatted_address || null,
          rank_position: index + 1,
          last_checked: new Date().toISOString(),
          alerts: [],
          active: true,
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        console.error(`[cron/competitor-monitoring] Failed to insert new competitor:`, insertErr);
        continue;
      }
      competitorId = inserted.id;
    }

    const rating = p.rating || null;
    const reviewCount = p.user_ratings_total || 0;
    const score = calculateCompetitorScore(rating, reviewCount, index);
    const alerts = buildCronAlerts(
      p.name,
      rating,
      reviewCount,
      { rating: userRating, reviewCount: userReviewCount },
      index
    );

    // Extract profile attributes from Places API result
    const profileAttrs = extractPlacesProfileAttrs(p);

    results.push({
      competitorId,
      placeId: p.place_id,
      rating,
      reviewCount,
      score,
      rankPosition: index + 1,
      alerts,
      // ── Enhanced profile attributes ──
      photo_count: profileAttrs.photo_count,
      latest_photo_date: profileAttrs.latest_photo_date,
      photo_freshness_score: calculatePhotoFreshnessScore({
        photoCount: profileAttrs.photo_count,
        latestPhotoDate: profileAttrs.latest_photo_date,
        snapshotDate: new Date().toISOString().slice(0, 10),
      }),
      categories: profileAttrs.categories,
      primary_category: profileAttrs.primary_category,
      hours_json: profileAttrs.hours_json,
      services: profileAttrs.services,
      posts_count: profileAttrs.posts_count,
      has_description: profileAttrs.has_description,
      has_website: profileAttrs.has_website,
      attributes: profileAttrs.attributes,
    });

    // Update last_checked and rank_position on existing competitors
    if (existing) {
      await supabase
        .from("competitors")
        .update({
          last_checked: new Date().toISOString(),
          rank_position: index + 1,
          alerts,
        })
        .eq("id", existing.id);
    }
  }

  // Mark competitors no longer in top 10 as inactive
  const activePlaceIds = new Set(filtered.map((p: any) => p.place_id));
  for (const comp of existingCompetitors) {
    if (comp.place_id && !activePlaceIds.has(comp.place_id)) {
      await supabase
        .from("competitors")
        .update({ active: false })
        .eq("id", comp.id);
    }
  }

  return results;
}

async function fetchPreviousSnapshots(
  supabase: any,
  userId: string
): Promise<Record<string, { latest: SnapshotRow | null; previous: SnapshotRow | null }>> {
  const { data } = await supabase
    .from("competitor_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false });

  if (!data || data.length === 0) return {};

  const grouped: Record<string, SnapshotRow[]> = {};
  for (const row of data) {
    const key = row.competitor_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  const result: Record<string, { latest: SnapshotRow | null; previous: SnapshotRow | null }> = {};
  for (const [compId, rows] of Object.entries(grouped)) {
    result[compId] = {
      latest: rows[0] ?? null,
      previous: rows[1] ?? null,
    };
  }

  return result;
}

async function persistSnapshots(
  supabase: any,
  userId: string,
  snapshots: Array<{
    competitorId: string;
    placeId: string;
    rating: number | null;
    reviewCount: number;
    score: number;
    rankPosition: number;
    alerts: CompetitorAlert[];
  }>
) {
  if (snapshots.length === 0) return;

  const rows = snapshots.map((s) => ({
    user_id: userId,
    competitor_id: s.competitorId,
    place_id: s.placeId,
    rating: s.rating,
    review_count: s.reviewCount,
    score: s.score,
    rank_position: s.rankPosition,
    alerts: s.alerts,
    snapshot_source: "cron",
    snapshot_date: new Date().toISOString().slice(0, 10),
    photo_count: (s as any).photo_count ?? null,
    latest_photo_date: (s as any).latest_photo_date ?? null,
    photo_freshness_score: (s as any).photo_freshness_score ?? null,
    categories: (s as any).categories ?? null,
    primary_category: (s as any).primary_category ?? null,
    hours_json: (s as any).hours_json ?? null,
    services: (s as any).services ?? null,
    posts_count: (s as any).posts_count ?? null,
    has_description: (s as any).has_description ?? null,
    has_website: (s as any).has_website ?? null,
    attributes: (s as any).attributes ?? null,
  }));

  const { error } = await supabase
    .from("competitor_snapshots")
    .upsert(rows, { onConflict: "competitor_id,snapshot_date" });

  if (error) {
    console.error("[cron/competitor-monitoring] Failed to persist snapshots:", error);
  }
}

function detectSignificantChanges(
  competitorName: string,
  latest: SnapshotRow,
  previous: SnapshotRow
): Array<{ title: string; description: string; severity: "info" | "warning" | "critical" }> {
  const changes: Array<{ title: string; description: string; severity: "info" | "warning" | "critical" }> = [];

  // ── Rating change (≥ 0.1 delta) ────────────────────────────────
  if (latest.rating !== null && previous.rating !== null) {
    const ratingDiff = Number(latest.rating) - Number(previous.rating);
    if (Math.abs(ratingDiff) >= 0.1) {
      const direction = ratingDiff > 0 ? "increased" : "decreased";
      const severity: "info" | "warning" | "critical" = ratingDiff <= -0.3 ? "warning" : "info";
      changes.push({
        title: `${competitorName} rating ${direction} to ${Number(latest.rating).toFixed(1)}★`,
        description: `Changed from ${Number(previous.rating).toFixed(1)}★ (Δ ${ratingDiff > 0 ? "+" : ""}${ratingDiff.toFixed(1)}). ${ratingDiff > 0 ? "They're improving — consider stepping up review generation." : "They're slipping — opportunity to gain ground."}`,
        severity,
      });
    }
  }

  // ── Review count change (any non-zero) ─────────────────────────
  const reviewDiff = (latest.review_count ?? 0) - (previous.review_count ?? 0);
  if (reviewDiff !== 0) {
    const direction = reviewDiff > 0 ? "gained" : "lost";
    const severity: "info" | "warning" | "critical" = reviewDiff >= 10 ? "warning" : "info";
    changes.push({
      title: `${competitorName} ${direction} ${Math.abs(reviewDiff)} review${Math.abs(reviewDiff) !== 1 ? "s" : ""}`,
      description: `Now at ${latest.review_count} reviews (was ${previous.review_count}). ${reviewDiff > 0 ? "Competitor is collecting reviews actively." : "Some reviews may have been removed."}`,
      severity,
    });
  }

  // ── Score change (≥ 3 points) ──────────────────────────────────
  const scoreDiff = (latest.score ?? 0) - (previous.score ?? 0);
  if (Math.abs(scoreDiff) >= 3) {
    const direction = scoreDiff > 0 ? "increased" : "dropped";
    const severity: "info" | "warning" | "critical" = scoreDiff <= -5 ? "warning" : "info";
    changes.push({
      title: `${competitorName} market score ${direction} to ${latest.score}`,
      description: `Was ${previous.score} (Δ ${scoreDiff > 0 ? "+" : ""}${scoreDiff}). ${scoreDiff > 0 ? "Competitor gained competitive ground." : "Competitor lost competitive ground — potential opening."}`,
      severity,
    });
  }

  // ── New critical alerts in latest snapshot ──────────────────────
  const prevAlertTypes = new Set(
    (previous.alerts || []).map((a: CompetitorAlert) => a.type)
  );
  const newAlerts = (latest.alerts || []).filter(
    (a: CompetitorAlert) => !prevAlertTypes.has(a.type) && a.severity === "critical"
  );
  for (const alert of newAlerts) {
    changes.push({
      title: `New alert: ${alert.title}`,
      description: alert.description,
      severity: "critical",
    });
  }

  return changes;
}

function calculateCompetitorScore(
  rating: number | null,
  reviewCount: number,
  rankIndex: number
): number {
  const ratingScore = rating ? Math.round((rating / 5) * 45) : 18;
  const reviewScore = Math.min(40, Math.round(reviewCount / 6));
  const rankBonus = Math.max(5, 15 - rankIndex * 2);
  return Math.min(95, ratingScore + reviewScore + rankBonus);
}

function snapshotToProfileAttrs(snap: SnapshotRow): ProfileAttributeSnapshot {
  return {
    photo_count: snap.photo_count ?? null,
    latest_photo_date: snap.latest_photo_date ?? null,
    photo_freshness_score: snap.photo_freshness_score ?? null,
    categories: Array.isArray(snap.categories) ? snap.categories : [],
    primary_category: snap.primary_category ?? null,
    hours_json: snap.hours_json ?? null,
    services: Array.isArray(snap.services) ? snap.services : [],
    posts_count: snap.posts_count ?? 0,
    has_description: snap.has_description ?? null,
    has_website: snap.has_website ?? null,
    attributes: snap.attributes && typeof snap.attributes === "object" ? snap.attributes : {},
  };
}

function extractPlacesProfileAttrs(p: any) {
  const photoCount = p.photos?.length ?? null;
  const latestPhotoDate = p.photos?.[0]?.photo_reference
    ? null // Google Places API doesn't expose photo upload dates
    : (p.latest_photo_date || null);

  return {
    photo_count: photoCount,
    latest_photo_date: latestPhotoDate,
    categories: Array.isArray(p.types) ? p.types : [],
    primary_category: Array.isArray(p.types) ? p.types[0] || null : null,
    hours_json: p.opening_hours?.periods || null,
    services: Array.isArray(p.service_items) ? p.service_items.map(String) : [],
    posts_count: p.posts_count ?? 0,
    has_description: !!p.description,
    has_website: !!p.website,
    attributes: p.attributes || {},
  };
}

function buildCronAlerts(
  competitorName: string,
  rating: number | null,
  reviewCount: number,
  userMetrics: { rating: number | null; reviewCount: number },
  rankIndex: number
): CompetitorAlert[] {
  const detectedAt = new Date().toISOString();
  const alerts: CompetitorAlert[] = [];

  if (rankIndex < 3) {
    alerts.push({
      type: "rank_presence",
      title: `${competitorName} is showing up near the top of the market`,
      description: "This business is ranking high in your city/category search set and should be watched closely.",
      severity: rankIndex === 0 ? "critical" : "warning",
      detectedAt,
    });
  }

  if (reviewCount >= Math.max(25, userMetrics.reviewCount + 10)) {
    alerts.push({
      type: "review_lead",
      title: `${competitorName} has a strong review advantage`,
      description: `${competitorName} currently has ${reviewCount} Google reviews, which is ahead of your visible review footprint.`,
      severity: reviewCount >= 100 ? "critical" : "warning",
      detectedAt,
    });
  }

  if (rating !== null && userMetrics.rating !== null && rating > userMetrics.rating + 0.2) {
    alerts.push({
      type: "rating_gap",
      title: `${competitorName} is winning on rating quality`,
      description: `${competitorName} is showing ${rating.toFixed(1)}★ versus your visible ${userMetrics.rating.toFixed(1)}★ in Google results.`,
      severity: "info",
      detectedAt,
    });
  }

  return alerts;
}
