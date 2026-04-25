/**
 * Public Business Profile Page
 * /profile/[slug] — SEO-optimized, crawlable public profile with JSON-LD.
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify, isEligibleForPublicProfile } from "@/lib/data-layer/profile-service";
import { generateSchemaMarkup } from "@/lib/data-layer/schema-generator";
import type { PublicBusinessProfile, SchemaMarkupOutput } from "@/lib/data-layer/types";
import ProfilePageClient from "./ProfilePageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchProfile(slug);
  if (!profile) return { title: "Profile Not Found" };

  return {
    title: `${profile.businessName} — Local SEO Report | Geothority`,
    description: profile.description,
    openGraph: {
      title: `${profile.businessName} — Geothority Score: ${profile.geothorityScore ?? "N/A"}`,
      description: profile.description,
      url: `${BASE_URL}/profile/${slug}`,
      siteName: "Geothority",
      type: "profile",
    },
    alternates: {
      canonical: `${BASE_URL}/profile/${slug}`,
    },
  };
}

// ISR: revalidate every 6 hours for published profiles
export const revalidate = 21600;

// Pre-generate popular profile slugs at build time
export async function generateStaticParams() {
  try {
    const supabase = createServiceClient();
    const { data: scans } = await supabase
      .from("scans")
      .select("user_id, url")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!scans?.length) return [];

    const userIds = Array.from(new Set(scans.map((s: any) => s.user_id)));
    const { data: users } = await supabase.from("user_profiles").select("id, plan").in("id", userIds);
    const eligibleIds = new Set(
      (users ?? []).filter((u: any) => isEligibleForPublicProfile(u.plan)).map((u: any) => u.id)
    );

    return scans
      .filter((s: any) => eligibleIds.has(s.user_id))
      .map((s: any) => ({ slug: slugify(s.url) }));
  } catch {
    return [];
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await fetchProfile(slug);
  if (!profile) notFound();

  const schema = generateSchemaMarkup(profile);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema.business) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema.webpage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema.breadcrumb) }}
      />
      {schema.faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema.faq) }}
        />
      )}
      {schema.aggregateRating && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema.aggregateRating) }}
        />
      )}
      <link rel="canonical" href={`${BASE_URL}/profile/${slug}`} />
      <ProfilePageClient profile={profile} />
    </>
  );
}

async function fetchProfile(slug: string): Promise<PublicBusinessProfile | null> {
  const supabase = createServiceClient();
  const domainPattern = slug.replace(/-/g, ".");

  const { data: scans } = await supabase
    .from("scans")
    .select("id, user_id, url, business_name, city, state, geothority_score, geo_readiness_score, layer_scores, quick_wins, competitor_gaps, created_at")
    .or(`url.ilike.%${domainPattern}%,url.ilike.%${slug}%`)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!scans?.length) return null;

  const scan = scans.find((s: any) => slugify(s.url) === slug) ?? scans[0];

  const { data: user } = await supabase
    .from("user_profiles")
    .select("id, plan, business_name, city, state")
    .eq("id", scan.user_id)
    .single();

  if (!user || !isEligibleForPublicProfile(user.plan)) return null;

  const businessName = scan.business_name || user.business_name || "Unknown Business";

  const profile: PublicBusinessProfile = {
    slug,
    businessName,
    description: `Local SEO analysis for ${businessName}${scan.city ? ` in ${scan.city}, ${scan.state}` : ""}.`,
    url: scan.url,
    city: scan.city || user.city,
    state: scan.state || user.state,
    address: null,
    phone: null,
    category: null,
    geothorityScore: scan.geothority_score,
    geoReadinessScore: scan.geo_readiness_score,
    layerScores: scan.layer_scores,
    quickWins: (scan.quick_wins ?? []).map((w: any) => ({ title: w.title, impact: w.impact, layer: w.layer })),
    competitorGaps: (scan.competitor_gaps ?? []).map((g: any) => ({ domain: g.domain, businessName: g.businessName, advantage: g.advantage })),
    schemaMarkup: {} as SchemaMarkupOutput,
    lastScanned: scan.created_at,
    publishedAt: scan.created_at,
  };

  return profile;
}
