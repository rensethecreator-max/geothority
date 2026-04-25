/**
 * Public Profiles Directory Page
 * /profiles — Browseable directory of all public business profiles.
 * Critical for crawlability and internal link equity.
 */

import { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify, isEligibleForPublicProfile } from "@/lib/data-layer/profile-service";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Business Profiles Directory | Geothority",
  description: "Browse local business SEO profiles analyzed by Geothority. See Geothority Scores, layer breakdowns, and competitor insights.",
  alternates: { canonical: `${BASE_URL}/profiles` },
  openGraph: {
    title: "Geothority Business Profiles",
    description: "Browse local business SEO profiles with Geothority Scores.",
    url: `${BASE_URL}/profiles`,
    type: "website",
  },
};

export default async function ProfilesDirectoryPage() {
  const supabase = createServiceClient();

  const { data: scans, error: scansError } = await supabase
    .from("scans")
    .select("user_id, url, business_name, city, state, geothority_score, created_at")
    .order("geothority_score", { ascending: false, nullsFirst: false })
    .limit(500);

  if (scansError) {
    throw new Error(`Failed to load public profiles: ${scansError.message}`);
  }

  const userIds = Array.from(new Set((scans ?? []).map((s: any) => s.user_id)));
  const { data: users, error: usersError } = userIds.length
    ? await supabase.from("user_profiles").select("id, plan").in("id", userIds)
    : { data: [], error: null };

  if (usersError) {
    throw new Error(`Failed to load profile eligibility: ${usersError.message}`);
  }

  const eligibleIds = new Set(
    (users ?? []).filter((u: any) => isEligibleForPublicProfile(u.plan)).map((u: any) => u.id)
  );

  const profiles = (scans ?? [])
    .filter((s: any) => eligibleIds.has(s.user_id))
    .map((s: any) => ({
      slug: slugify(s.url),
      businessName: s.business_name || "Unknown Business",
      city: s.city,
      state: s.state,
      score: s.geothority_score,
      lastScanned: s.created_at,
    }));

  // Group by state for browseability
  const byState: Record<string, typeof profiles> = {};
  for (const p of profiles) {
    const key = p.state || "Other";
    if (!byState[key]) byState[key] = [];
    byState[key].push(p);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Business Profiles</h1>
        <p className="text-gray-400 mb-8">
          Browse {profiles.length} local businesses analyzed by Geothority. Each profile includes a Geothority Score, layer breakdown, and competitor insights.
        </p>

        {Object.entries(byState)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([state, stateProfiles]) => (
            <div key={state} className="mb-10">
              <h2 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">{state}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stateProfiles.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/profile/${p.slug}`}
                    className="border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition group"
                  >
                    <div className="font-semibold group-hover:text-blue-400 transition">{p.businessName}</div>
                    {p.city && <div className="text-sm text-gray-400">{p.city}</div>}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        (p.score ?? 0) >= 80 ? "text-green-500" : (p.score ?? 0) >= 50 ? "text-yellow-500" : "text-red-500"
                      }`}>{p.score ?? "—"}</span>
                      <span className="text-xs text-gray-500">Geothority Score</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Don&apos;t see your business?</p>
          <Link href="/signup" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition">
            Run Your Free Scan →
          </Link>
        </div>
      </div>
    </div>
  );
}
