/**
 * GET /profiles/geo.kml
 * Geo Sitemap in KML format for local search engines.
 * Helps Google and other engines associate profiles with geographic locations.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify, isEligibleForPublicProfile } from "@/lib/data-layer/profile-service";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

export async function GET() {
  const supabase = createServiceClient();

  const { data: scans } = await supabase
    .from("scans")
    .select("user_id, url, business_name, city, state, latitude, longitude, geothority_score, created_at")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (!scans?.length) {
    return new NextResponse(renderKML([]), {
      headers: { "Content-Type": "application/vnd.google-earth.kml+xml; charset=utf-8" },
    });
  }

  const userIds = Array.from(new Set(scans.map((s: any) => s.user_id)));
  const { data: users } = await supabase.from("profiles").select("id, plan").in("id", userIds);
  const eligibleIds = new Set(
    (users ?? []).filter((u: any) => isEligibleForPublicProfile(u.plan)).map((u: any) => u.id)
  );

  const placemarks = scans
    .filter((s: any) => eligibleIds.has(s.user_id))
    .map((s: any) => ({
      name: s.business_name || "Unknown Business",
      slug: slugify(s.url),
      city: s.city,
      state: s.state,
      lat: s.latitude,
      lng: s.longitude,
      score: s.geothority_score,
    }));

  return new NextResponse(renderKML(placemarks), {
    headers: {
      "Content-Type": "application/vnd.google-earth.kml+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function renderKML(placemarks: Array<{ name: string; slug: string; city: string | null; state: string | null; lat: number; lng: number; score: number | null }>): string {
  const marks = placemarks
    .map(
      (p) => `    <Placemark>
      <name>${escapeXml(p.name)}</name>
      <description>Geothority Score: ${p.score ?? "N/A"}${p.city ? ` | ${p.city}, ${p.state}` : ""}</description>
      <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
      <ExtendedData>
        <Data name="profileUrl"><value>${BASE_URL}/profile/${p.slug}</value></Data>
        <Data name="geothorityScore"><value>${p.score ?? ""}</value></Data>
      </ExtendedData>
    </Placemark>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Geothority Business Profiles</name>
    <description>Geo-referenced local business profiles from Geothority</description>
${marks}
  </Document>
</kml>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
