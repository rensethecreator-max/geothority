/**
 * Dynamic Sitemap Generator
 * Generates sitemap entries for all public business profiles.
 * Merges with existing static pages.
 */

import type { SitemapEntry } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

export function generateStaticSitemapEntries(): SitemapEntry[] {
  const comparePages = [
    "geothority-vs-brightlocal", "geothority-vs-moz-local", "geothority-vs-semrush",
    "geothority-vs-whitespark", "geothority-vs-yext",
  ];
  const industryPages = ["insurance-agents", "real-estate-agents", "dentists", "lawyers", "restaurants"];
  const cityPages = ["chicago", "austin", "tampa", "atlanta", "dallas"];

  return [
    { url: BASE_URL, lastModified: new Date().toISOString(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date().toISOString(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/signup`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.8 },
    ...comparePages.map((s) => ({ url: `${BASE_URL}/compare/${s}`, lastModified: new Date().toISOString(), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...industryPages.map((s) => ({ url: `${BASE_URL}/for/${s}`, lastModified: new Date().toISOString(), changeFrequency: "weekly" as const, priority: 0.85 })),
    ...cityPages.map((c) => ({ url: `${BASE_URL}/locations/${c}`, lastModified: new Date().toISOString(), changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}

export function generateProfileSitemapEntries(slugs: string[], lastScannedDates: Record<string, string>): SitemapEntry[] {
  return slugs.map((slug) => ({
    url: `${BASE_URL}/profile/${slug}`,
    lastModified: lastScannedDates[slug] ?? new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
}

export function generateFullSitemap(
  profileSlugs: string[],
  lastScannedDates: Record<string, string>
): SitemapEntry[] {
  return [...generateStaticSitemapEntries(), ...generateProfileSitemapEntries(profileSlugs, lastScannedDates)];
}

/**
 * Generate sitemap XML string.
 */
export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${e.url}</loc>
    <lastmod>${e.lastModified}</lastmod>
    <changefreq>${e.changeFrequency}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
