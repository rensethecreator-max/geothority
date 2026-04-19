/**
 * Public Business Profile Service
 * Fetches and transforms scan data into public-facing profile objects.
 * Only publishes profiles for users who have opted in (plan >= growth).
 */

import type { PublicBusinessProfile, PublicQuickWin, PublicCompetitorGap, SchemaMarkupOutput } from "./types";
import { generateSchemaMarkup } from "./schema-generator";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

interface ScanRow {
  id: string;
  user_id: string;
  url: string;
  business_name: string | null;
  city: string | null;
  state: string | null;
  geothority_score: number | null;
  geo_readiness_score: number | null;
  layer_scores: Record<string, number> | null;
  quick_wins: Array<{ title: string; description: string; impact: string; layer: number }> | null;
  competitor_gaps: Array<{ domain: string; businessName: string; advantage: string }> | null;
  created_at: string;
}

interface UserProfileRow {
  id: string;
  business_name: string | null;
  city: string | null;
  state: string | null;
  website_url: string | null;
  plan: string;
}

/**
 * Get a public profile by slug (domain-based).
 */
export async function getPublicProfile(
  slug: string,
  fetchScan: (slug: string) => Promise<ScanRow | null>,
  fetchUser: (userId: string) => Promise<UserProfileRow | null>
): Promise<PublicBusinessProfile | null> {
  const scan = await fetchScan(slug);
  if (!scan) return null;

  const user = await fetchUser(scan.user_id);
  // Only allow public profiles for eligible plans
  if (!user || !isEligibleForPublicProfile(user.plan)) return null;

  return transformToPublicProfile(scan, user);
}

/**
 * List all public profiles (for sitemap / directory).
 */
export async function listPublicProfiles(
  fetchEligibleScans: () => Promise<ScanRow[]>
): Promise<PublicBusinessProfile[]> {
  const scans = await fetchEligibleScans();
  return scans
    .filter(() => true) // eligibility already filtered at query level
    .map((scan) => transformToPublicProfile(scan, null));
}

function transformToPublicProfile(
  scan: ScanRow,
  user: UserProfileRow | null
): PublicBusinessProfile {
  const businessName = scan.business_name || user?.business_name || "Unknown Business";
  const slug = slugify(scan.url);
  const description = `Local SEO analysis and Geothority Score for ${businessName}${scan.city ? ` in ${scan.city}, ${scan.state}` : ""}.`;

  const profile: PublicBusinessProfile = {
    slug,
    businessName,
    description,
    url: scan.url,
    city: scan.city || user?.city || null,
    state: scan.state || user?.state || null,
    address: null, // not stored in scan; could be enriched from GBP
    phone: null,
    category: null,
    geothorityScore: scan.geothority_score,
    geoReadinessScore: scan.geo_readiness_score,
    layerScores: scan.layer_scores,
    quickWins: (scan.quick_wins ?? []).map(mapQuickWin),
    competitorGaps: (scan.competitor_gaps ?? []).map(mapCompetitorGap),
    schemaMarkup: {} as SchemaMarkupOutput, // filled below
    lastScanned: scan.created_at,
    publishedAt: scan.created_at,
  };

  profile.schemaMarkup = generateSchemaMarkup(profile);
  return profile;
}

function mapQuickWin(w: { title: string; impact: string; layer: number }): PublicQuickWin {
  return { title: w.title, impact: w.impact as "high" | "medium" | "low", layer: w.layer };
}

function mapCompetitorGap(g: { domain: string; businessName: string; advantage: string }): PublicCompetitorGap {
  return { domain: g.domain, businessName: g.businessName, advantage: g.advantage };
}

function isEligibleForPublicProfile(plan: string): boolean {
  return ["growth", "authority", "agency", "pro"].includes(plan);
}

function slugify(url: string): string {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return hostname.replace(/^www\./, "").replace(/\./g, "-");
  } catch {
    return url.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }
}

export { slugify, isEligibleForPublicProfile };
