import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isEligibleForPublicProfile, slugify } from "@/lib/data-layer/profile-service";
import { generateProfileFeed, renderRSSXml } from "@/lib/data-layer/rss-generator";

export async function GET() {
  const supabase = createServiceClient();

  const { data: scans } = await supabase
    .from("scans")
    .select("user_id, url, business_name, city, state, geothority_score, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!scans?.length) {
    return new NextResponse(renderRSSXml(generateProfileFeed([])), {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }

  const userIds = Array.from(new Set(scans.map((s: any) => s.user_id)));
  const { data: users } = await supabase.from("user_profiles").select("id, plan").in("id", userIds);

  const eligibleIds = new Set(
    (users ?? []).filter((u: any) => isEligibleForPublicProfile(u.plan)).map((u: any) => u.id)
  );

  const eligibleScans = scans
    .filter((s: any) => eligibleIds.has(s.user_id))
    .map((s: any) => ({
      slug: slugify(s.url),
      businessName: s.business_name || "Unknown Business",
      city: s.city,
      state: s.state,
      geothorityScore: s.geothority_score,
      publishedAt: s.created_at,
    }));

  return new NextResponse(renderRSSXml(generateProfileFeed(eligibleScans)), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
