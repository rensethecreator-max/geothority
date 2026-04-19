/**
 * Sitemap Index Generator
 * Generates a sitemapindex.xml that references all sub-sitemaps.
 * This is the proper way to handle large sitemaps per the sitemap protocol.
 */

import type { SitemapEntry } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

export interface SitemapIndexEntry {
  loc: string;
  lastModified: string;
}

export function generateSitemapIndex(entries: SitemapIndexEntry[]): string {
  const sitemaps = entries
    .map(
      (e) => `  <sitemap>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastModified}</lastmod>
  </sitemap>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;
}

/**
 * Generate the standard sitemap index for Geothority.
 * Includes static pages sitemap + dynamic profiles sitemap.
 */
export function generateDefaultSitemapIndex(): string {
  const now = new Date().toISOString();
  return generateSitemapIndex([
    { loc: `${BASE_URL}/sitemap.xml`, lastModified: now },
    { loc: `${BASE_URL}/profiles/sitemap.xml`, lastModified: now },
  ]);
}

/**
 * Generate paginated profile sitemap files for large datasets.
 * Google limits 50,000 URLs per sitemap file.
 */
export function paginateSitemapEntries(
  entries: SitemapEntry[],
  maxPerFile = 50000
): SitemapEntry[][] {
  const pages: SitemapEntry[][] = [];
  for (let i = 0; i < entries.length; i += maxPerFile) {
    pages.push(entries.slice(i, i + maxPerFile));
  }
  return pages.length > 0 ? pages : [[]];
}
