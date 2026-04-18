// ============================================================
// Competitor Change Detection — Enhanced Engine
// Detects significant changes in competitor GBP profiles including
// photos, categories, hours, services, posts, and other attributes.
// Integrates with existing snapshot system.
// ============================================================

// ── Types ────────────────────────────────────────────────────────

export type ChangeSeverity = "info" | "warning" | "critical";

export interface ProfileAttributeSnapshot {
  photo_count: number | null;
  latest_photo_date: string | null;
  photo_freshness_score: number | null;
  categories: string[];
  primary_category: string | null;
  hours_json: HoursPeriod[] | null;
  services: string[];
  posts_count: number;
  has_description: boolean | null;
  has_website: boolean | null;
  attributes: Record<string, any>;
}

export interface HoursPeriod {
  openDay: string;
  openTime: string;
  closeDay: string;
  closeTime: string;
}

export interface DetectedChange {
  changeType: string;
  changeLabel: string;
  changeDetail: {
    before: any;
    after: any;
    delta?: number | string;
  };
  severity: ChangeSeverity;
  recommendation?: string;
}

// ── Thresholds ────────────────────────────────────────────────────

export const CHANGE_THRESHOLDS = {
  photos: {
    count_increase_warning: 3, // +3 new photos → warning
    count_increase_critical: 6, // +6 new photos → critical
    freshness_drop_warning: 20, // freshness score dropped 20+ points
    freshness_drop_critical: 40,
    no_new_photos_days_warning: 60, // no new photos in 60 days → warning
    no_new_photos_days_critical: 120, // no new photos in 120 days → critical
  },
  category: {
    any_change: true, // any category addition/removal is notable
    primary_change_severity: "critical" as ChangeSeverity, // primary category change is critical
  },
  hours: {
    any_change: true,
    extended_hours_severity: "warning" as ChangeSeverity, // competitor extended hours
  },
  services: {
    added_count_warning: 2, // competitor added 2+ services
    added_count_critical: 4,
    removed_count_info: 1, // competitor removed services (opportunity)
  },
  posts: {
    count_increase_warning: 2, // competitor posted 2+ new posts
    count_increase_critical: 4,
    first_post_severity: "warning" as ChangeSeverity, // competitor just started posting
  },
  description: {
    added_severity: "warning" as ChangeSeverity, // competitor added a description
    removed_severity: "info" as ChangeSeverity,
  },
  website: {
    added_severity: "warning" as ChangeSeverity,
    removed_severity: "info" as ChangeSeverity,
  },
  attributes: {
    added_count_warning: 3,
    added_count_critical: 5,
  },
};

// ── Photo Freshness Score ─────────────────────────────────────────

/**
 * Calculate a 0-100 freshness score for competitor photos.
 * Higher = more recent/fresh photo activity.
 *
 * Scoring:
 * - Recency: How recently was the last photo added (0-50 pts)
 * - Volume: Total photo count relative to expected minimum (0-30 pts)
 * - Cadence: Consistent upload pattern vs sporadic (0-20 pts, simplified)
 */
export function calculatePhotoFreshnessScore(input: {
  photoCount: number | null;
  latestPhotoDate: string | null;
  snapshotDate: string;
}): number {
  const { photoCount, latestPhotoDate, snapshotDate } = input;
  if (!photoCount || photoCount === 0) return 0;

  let score = 0;

  // ── Recency (0-50) ──────────────────────────────────────────
  if (latestPhotoDate) {
    const snapshotTime = new Date(snapshotDate).getTime();
    const lastPhotoTime = new Date(latestPhotoDate).getTime();
    const daysSince = Math.max(0, (snapshotTime - lastPhotoTime) / (1000 * 60 * 60 * 24));

    if (daysSince <= 7) score += 50;
    else if (daysSince <= 14) score += 42;
    else if (daysSince <= 30) score += 33;
    else if (daysSince <= 60) score += 22;
    else if (daysSince <= 90) score += 12;
    else score += 5;
  } else {
    score += 10; // unknown recency, partial credit for having photos
  }

  // ── Volume (0-30) ───────────────────────────────────────────
  if (photoCount >= 20) score += 30;
  else if (photoCount >= 12) score += 24;
  else if (photoCount >= 6) score += 16;
  else if (photoCount >= 3) score += 8;
  else score += 3;

  // ── Cadence bonus (simplified: 0-20) ─────────────────────────
  // If we have recent photos AND a decent volume, assume good cadence
  if (latestPhotoDate && photoCount >= 6) score += 20;
  else if (latestPhotoDate && photoCount >= 3) score += 10;
  else score += 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── Detect All Profile Changes ────────────────────────────────────

export function detectProfileChanges(
  competitorName: string,
  current: ProfileAttributeSnapshot,
  previous: ProfileAttributeSnapshot | null
): DetectedChange[] {
  if (!previous) return []; // first snapshot, no comparison possible

  const changes: DetectedChange[] = [];

  // ── Photo changes ───────────────────────────────────────────
  changes.push(...detectPhotoChanges(competitorName, current, previous));

  // ── Category changes ────────────────────────────────────────
  changes.push(...detectCategoryChanges(competitorName, current, previous));

  // ── Hours changes ───────────────────────────────────────────
  changes.push(...detectHoursChanges(competitorName, current, previous));

  // ── Services changes ────────────────────────────────────────
  changes.push(...detectServicesChanges(competitorName, current, previous));

  // ── Posts changes ───────────────────────────────────────────
  changes.push(...detectPostsChanges(competitorName, current, previous));

  // ── Description changes ──────────────────────────────────────
  changes.push(...detectDescriptionChanges(competitorName, current, previous));

  // ── Website changes ─────────────────────────────────────────
  changes.push(...detectWebsiteChanges(competitorName, current, previous));

  // ── Attribute changes ───────────────────────────────────────
  changes.push(...detectAttributeChanges(competitorName, current, previous));

  return changes;
}

// ── Photo Change Detection ────────────────────────────────────────

function detectPhotoChanges(
  name: string,
  current: ProfileAttributeSnapshot,
  previous: ProfileAttributeSnapshot
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  const t = CHANGE_THRESHOLDS.photos;

  // Photo count change
  if (current.photo_count !== null && previous.photo_count !== null) {
    const delta = current.photo_count - previous.photo_count;
    if (delta > 0) {
      let severity: ChangeSeverity = "info";
      if (delta >= t.count_increase_critical) severity = "critical";
      else if (delta >= t.count_increase_warning) severity = "warning";

      changes.push({
        changeType: "photo_count",
        changeLabel: `${name} added ${delta} new photo${delta !== 1 ? "s" : ""}`,
        changeDetail: {
          before: previous.photo_count,
          after: current.photo_count,
          delta,
        },
        severity,
        recommendation: severity !== "info"
          ? "Consider refreshing your own GBP photos with branded content, team shots, or seasonal graphics."
          : undefined,
      });
    }
  }

  // Photo freshness score change
  if (current.photo_freshness_score !== null && previous.photo_freshness_score !== null) {
    const delta = current.photo_freshness_score - previous.photo_freshness_score;
    if (delta >= t.freshness_drop_warning) {
      const severity: ChangeSeverity = delta >= t.freshness_drop_critical ? "critical" : "warning";
      changes.push({
        changeType: "photo_freshness",
        changeLabel: `${name} photo freshness surged by ${delta} points`,
        changeDetail: {
          before: previous.photo_freshness_score,
          after: current.photo_freshness_score,
          delta,
        },
        severity,
        recommendation: "Competitor is actively refreshing their visual content. Upload new photos to maintain parity.",
      });
    } else if (delta <= -t.freshness_drop_warning) {
      const severity: ChangeSeverity = delta <= -t.freshness_drop_critical ? "critical" : "warning";
      changes.push({
        changeType: "photo_freshness",
        changeLabel: `${name} photo freshness dropped by ${Math.abs(delta)} points`,
        changeDetail: {
          before: previous.photo_freshness_score,
          after: current.photo_freshness_score,
          delta,
        },
        severity: "info", // competitor weakness = opportunity, not threat
        recommendation: "Competitor's visual content is getting stale — opportunity to gain ground with fresh photos.",
      });
    }
  }

  // No new photos in a long time (stale competitor)
  if (current.latest_photo_date && previous.latest_photo_date) {
    const daysSinceLastPhoto = Math.round(
      (Date.now() - new Date(current.latest_photo_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastPhoto > t.no_new_photos_days_critical && previous.latest_photo_date === current.latest_photo_date) {
      changes.push({
        changeType: "photo_staleness",
        changeLabel: `${name} hasn't added photos in ${daysSinceLastPhoto}+ days`,
        changeDetail: {
          before: previous.latest_photo_date,
          after: current.latest_photo_date,
          delta: `${daysSinceLastPhoto} days stale`,
        },
        severity: "info",
        recommendation: "Competitor's profile is stale. Upload fresh photos to overtake them on visual freshness signals.",
      });
    }
  }

  return changes;
}

// ── Category Change Detection ─────────────────────────────────────

function detectCategoryChanges(
  name: string,
  current: ProfileAttributeSnapshot,
  previous: ProfileAttributeSnapshot
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  const t = CHANGE_THRESHOLDS.category;

  // Primary category change
  if (current.primary_category && previous.primary_category && current.primary_category !== previous.primary_category) {
    changes.push({
      changeType: "category",
      changeLabel: `${name} changed primary category to "${current.primary_category}"`,
      changeDetail: {
        before: previous.primary_category,
        after: current.primary_category,
      },
      severity: t.primary_change_severity,
      recommendation: "Primary category changes can significantly shift local search rankings. Verify your own categories are optimal.",
    });
  }

  // Additional categories added/removed
  const prevCats = new Set(previous.categories || []);
  const currCats = new Set(current.categories || []);
  const added = Array.from(currCats).filter((c) => !prevCats.has(c));
  const removed = Array.from(prevCats).filter((c) => !currCats.has(c));

  if (added.length > 0) {
    changes.push({
      changeType: "category",
      changeLabel: `${name} added ${added.length} categor${added.length !== 1 ? "ies" : "y"}: ${added.join(", ")}`,
      changeDetail: {
        before: previous.categories,
        after: current.categories,
        delta: `+${added.length}`,
      },
      severity: added.length >= 3 ? "warning" : "info",
      recommendation: "Competitor expanded their category coverage. Review your own categories for gaps.",
    });
  }

  if (removed.length > 0) {
    changes.push({
      changeType: "category",
      changeLabel: `${name} removed ${removed.length} categor${removed.length !== 1 ? "ies" : "y"}: ${removed.join(", ")}`,
      changeDetail: {
        before: previous.categories,
        after: current.categories,
        delta: `-${removed.length}`,
      },
      severity: "info",
      recommendation: "Competitor narrowed categories — could indicate focus shift or cleanup.",
    });
  }

  return changes;
}

// ── Hours Change Detection ───────────────────────────────────────

function detectHoursChanges(
  name: string,
  current: ProfileAttributeSnapshot,
  previous: ProfileAttributeSnapshot
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  const t = CHANGE_THRESHOLDS.hours;

  if (!current.hours_json || !previous.hours_json) return changes;

  const currentStr = JSON.stringify(normalizeHours(current.hours_json));
  const previousStr = JSON.stringify(normalizeHours(previous.hours_json));

  if (currentStr !== previousStr) {
    // Determine if hours were extended (more open time) or reduced
    const currentTotalMinutes = totalOpenMinutes(current.hours_json);
    const previousTotalMinutes = totalOpenMinutes(previous.hours_json);
    const delta = currentTotalMinutes - previousTotalMinutes;

    let label: string;
    if (delta > 0) {
      label = `${name} extended their hours by ~${Math.round(delta / 60)}h/week`;
    } else if (delta < 0) {
      label = `${name} reduced their hours by ~${Math.round(Math.abs(delta) / 60)}h/week`;
    } else {
      label = `${name} changed their business hours`;
    }

    changes.push({
      changeType: "hours",
      changeLabel: label,
      changeDetail: {
        before: previous.hours_json,
        after: current.hours_json,
        delta: `${delta > 0 ? "+" : ""}${delta} min/week`,
      },
      severity: delta > 0 ? t.extended_hours_severity : "info",
      recommendation: delta > 0
        ? "Competitor is making themselves more available. Ensure your hours are accurate and competitive."
        : "Competitor reduced hours — potential customer service gap you can exploit.",
    });
  }

  return changes;
}

// ── Services Change Detection ─────────────────────────────────────

function detectServicesChanges(
  name: string,
  current: ProfileAttributeSnapshot,
  previous: ProfileAttributeSnapshot
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  const t = CHANGE_THRESHOLDS.services;

  const prevServices = new Set(previous.services || []);
  const currServices = new Set(current.services || []);
  const added = Array.from(currServices).filter((s) => !prevServices.has(s));
  const removed = Array.from(prevServices).filter((s) => !currServices.has(s));

  if (added.length > 0) {
    let severity: ChangeSeverity = "info";
    if (added.length >= t.added_count_critical) severity = "critical";
    else if (added.length >= t.added_count_warning) severity = "warning";

    changes.push({
      changeType: "services",
      changeLabel: `${name} added ${added.length} service${added.length !== 1 ? "s" : ""}`,
      changeDetail: {
        before: previous.services,
        after: current.services,
        delta: `+${added.length}`,
      },
      severity,
      recommendation: severity !== "info"
        ? `Competitor expanded offerings: ${added.slice(0, 3).join(", ")}${added.length > 3 ? ` +${added.length - 3} more` : ""}. Review your service list.`
        : undefined,
    });
  }

  if (removed.length > 0) {
    changes.push({
      changeType: "services",
      changeLabel: `${name} removed ${removed.length} service${removed.length !== 1 ? "s" : ""}`,
      changeDetail: {
        before: previous.services,
        after: current.services,
        delta: `-${removed.length}`,
      },
      severity: "info",
      recommendation: "Competitor dropped services — potential opening to capture that demand.",
    });
  }

  return changes;
}

// ── Posts Change Detection ─────────────────────────────────────────

function detectPostsChanges(
  name: string,
  current: ProfileAttributeSnapshot,
  previous: ProfileAttributeSnapshot
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  const t = CHANGE_THRESHOLDS.posts;

  if (current.posts_count == null || previous.posts_count == null) return changes;

  const delta = current.posts_count - previous.posts_count;

  if (delta > 0) {
    let severity: ChangeSeverity = "info";
    if (delta >= t.count_increase_critical) severity = "critical";
    else if (delta >= t.count_increase_warning) severity = "warning";

    changes.push({
      changeType: "posts",
      changeLabel: `${name} posted ${delta} new GBP post${delta !== 1 ? "s" : ""}`,
      changeDetail: {
        before: previous.posts_count,
        after: current.posts_count,
        delta,
      },
      severity,
      recommendation: severity !== "info"
        ? "Competitor is actively posting on GBP. Start or increase your own GBP post cadence."
        : undefined,
    });
  }

  // Competitor just started posting (was 0, now > 0)
  if (previous.posts_count === 0 && current.posts_count > 0) {
    changes.push({
      changeType: "posts",
      changeLabel: `${name} just started posting on GBP`,
      changeDetail: {
        before: 0,
        after: current.posts_count,
      },
      severity: t.first_post_severity,
      recommendation: "Competitor activated their GBP posting. Match or exceed their cadence.",
    });
  }

  return changes;
}

// ── Description Change Detection ──────────────────────────────────

function detectDescriptionChanges(
  name: string,
  current: ProfileAttributeSnapshot,
  previous: ProfileAttributeSnapshot
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  const t = CHANGE_THRESHOLDS.description;

  if (current.has_description !== previous.has_description) {
    if (current.has_description && !previous.has_description) {
      changes.push({
        changeType: "description",
        changeLabel: `${name} added a business description`,
        changeDetail: { before: false, after: true },
        severity: t.added_severity,
        recommendation: "Competitor improved profile completeness. Ensure your description is optimized.",
      });
    } else {
      changes.push({
        changeType: "description",
        changeLabel: `${name} removed their business description`,
        changeDetail: { before: true, after: false },
        severity: t.removed_severity,
      });
    }
  }

  return changes;
}

// ── Website Change Detection ──────────────────────────────────────

function detectWebsiteChanges(
  name: string,
  current: ProfileAttributeSnapshot,
  previous: ProfileAttributeSnapshot
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  const t = CHANGE_THRESHOLDS.website;

  if (current.has_website !== previous.has_website) {
    if (current.has_website && !previous.has_website) {
      changes.push({
        changeType: "website",
        changeLabel: `${name} added a website URL to their GBP`,
        changeDetail: { before: false, after: true },
        severity: t.added_severity,
        recommendation: "Competitor added a website link — this drives traffic and trust signals.",
      });
    } else {
      changes.push({
        changeType: "website",
        changeLabel: `${name} removed their website URL`,
        changeDetail: { before: true, after: false },
        severity: t.removed_severity,
      });
    }
  }

  return changes;
}

// ── Attribute Change Detection ────────────────────────────────────

function detectAttributeChanges(
  name: string,
  current: ProfileAttributeSnapshot,
  previous: ProfileAttributeSnapshot
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  const t = CHANGE_THRESHOLDS.attributes;

  const prevKeys = new Set(Object.keys(previous.attributes || {}));
  const currKeys = new Set(Object.keys(current.attributes || {}));
  const added = Array.from(currKeys).filter((k) => !prevKeys.has(k));
  const removed = Array.from(prevKeys).filter((k) => !currKeys.has(k));

  if (added.length > 0) {
    let severity: ChangeSeverity = "info";
    if (added.length >= t.added_count_critical) severity = "critical";
    else if (added.length >= t.added_count_warning) severity = "warning";

    changes.push({
      changeType: "attributes",
      changeLabel: `${name} added ${added.length} GBP attribute${added.length !== 1 ? "s" : ""}`,
      changeDetail: {
        before: Object.keys(previous.attributes || {}).length,
        after: Object.keys(current.attributes || {}).length,
        delta: `+${added.length}`,
      },
      severity,
      recommendation: severity !== "info"
        ? "Competitor is enriching their profile attributes. Review and add missing attributes to your own GBP."
        : undefined,
    });
  }

  if (removed.length > 0) {
    changes.push({
      changeType: "attributes",
      changeLabel: `${name} removed ${removed.length} GBP attribute${removed.length !== 1 ? "s" : ""}`,
      changeDetail: {
        before: Object.keys(previous.attributes || {}).length,
        after: Object.keys(current.attributes || {}).length,
        delta: `-${removed.length}`,
      },
      severity: "info",
    });
  }

  return changes;
}

// ── Helpers ───────────────────────────────────────────────────────

function normalizeHours(hours: HoursPeriod[]): HoursPeriod[] {
  return hours
    .map((h) => ({
      openDay: h.openDay,
      openTime: h.openTime,
      closeDay: h.closeDay,
      closeTime: h.closeTime,
    }))
    .sort((a, b) => `${a.openDay}${a.openTime}`.localeCompare(`${b.openDay}${b.openTime}`));
}

function totalOpenMinutes(hours: HoursPeriod[]): number {
  const dayMinutes: Record<string, number> = {};
  for (const period of hours) {
    const key = period.openDay;
    const openMin = timeToMinutes(period.openTime);
    const closeMin = timeToMinutes(period.closeTime);
    dayMinutes[key] = (dayMinutes[key] || 0) + (closeMin - openMin);
  }
  return Object.values(dayMinutes).reduce((sum, m) => sum + m, 0);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ── Extract profile attributes from Google Places API result ──────

export function extractProfileAttributes(place: any): ProfileAttributeSnapshot {
  const photoCount = place.photos?.length ?? place.user_ratings_total ? null : null;
  const latestPhotoDate = extractLatestPhotoDate(place);

  const categories = place.types || [];
  const primaryCategory = categories[0] || null;

  const hours_json = place.opening_hours?.periods || null;
  const services = place.service_items || [];
  const postsCount = place.posts_count ?? 0;

  return {
    photo_count: photoCount ?? place.photo_count ?? null,
    latest_photo_date: latestPhotoDate,
    photo_freshness_score: null, // computed after with calculatePhotoFreshnessScore
    categories,
    primary_category: primaryCategory,
    hours_json,
    services: Array.isArray(services) ? services.map(String) : [],
    posts_count: postsCount,
    has_description: place.description ? true : null,
    has_website: place.website ? true : null,
    attributes: place.attributes || {},
  };
}

function extractLatestPhotoDate(place: any): string | null {
  // Google Places API doesn't return photo dates directly.
  // When available (GBP API or enriched data), use it.
  return place.latest_photo_date || place.photo_last_updated || null;
}

// ── Convert DetectedChange to notification-friendly format ───────

export function changeToNotification(change: DetectedChange, competitorName: string) {
  return {
    type: change.changeType,
    title: change.changeLabel,
    description: change.recommendation || `Detected change in ${change.changeType}: ${JSON.stringify(change.changeDetail)}`,
    severity: change.severity,
    detectedAt: new Date().toISOString(),
    isNew: true,
    delta: change.changeDetail.delta?.toString(),
  };
}
