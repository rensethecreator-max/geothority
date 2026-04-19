import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isEligibleForPublicProfile, slugify } from "@/lib/data-layer/profile-service";
import { generateProfileSitemapEntries, renderSitemapXml } from "@/lib/data-layer/sitemap-generator";

export async function GET() {
  const supabase = createServiceClient();

  const { data: scans } = await supabase
    .from("scans")
    .select("user_id, url, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (!scans?.length) {
    return new NextResponse(renderSitemapXml([]), {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }

  const userIds = Array.from(new Set(scans.map((s: any) => s.user_id)));
  const { data: users } = await supabase.from("profiles").select("id, plan").in("id", userIds);

  const eligibleIds = new Set(
    (users ?? []).filter((u: any) => isEligibleForPublicProfile(u.plan)).map((u: any) => u.id)
  );

  const eligibleScans = scans.filter((s: any) => eligibleIds.has(s.user_id));
  const slugs = eligibleScans.map((s: any) => slugify(s.url));
  const lastScannedDates: Record<string, string> = {};
  eligibleScans.forEach((s: any) => { lastScannedDates[slugify(s.url)] = s.created_at; });

  return new NextResponse(renderSitemapXml(generateProfileSitemapEntries(slugs, lastScannedDates)), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
