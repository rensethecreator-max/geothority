/**
 * RSS Feed Generator
 * Generates RSS 2.0 feeds for newly published business profiles and score updates.
 */

import type { RSSFeed, RSSItem } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

export type ProfileFeedItem = {
  slug: string;
  businessName: string;
  city: string | null;
  state: string | null;
  geothorityScore: number | null;
  publishedAt: string;
  previousScore?: number | null;
};

export function generateProfileFeed(items: ProfileFeedItem[]): RSSFeed {
  const rssItems: RSSItem[] = items.map((item) => {
    const isUpdate = item.previousScore !== undefined && item.previousScore !== null;
    const scoreDelta = isUpdate && item.geothorityScore !== null ? item.geothorityScore - (item.previousScore ?? 0) : null;
    const title = isUpdate
      ? `${item.businessName} — Score Update: ${item.previousScore} → ${item.geothorityScore} (${scoreDelta !== null ? (scoreDelta >= 0 ? "+" : "") + scoreDelta : "N/A"})`
      : `${item.businessName} — Geothority Score: ${item.geothorityScore ?? "N/A"}`;
    const description = isUpdate
      ? `Score update for ${item.businessName}${item.city ? ` in ${item.city}, ${item.state}` : ""}: ${item.previousScore} → ${item.geothorityScore}.`
      : `Local SEO analysis for ${item.businessName}${item.city ? ` in ${item.city}, ${item.state}` : ""}. Geothority Score: ${item.geothorityScore ?? "Pending"}.`;

    return {
      title,
      link: `${BASE_URL}/profile/${item.slug}`,
      description,
      pubDate: new Date(item.publishedAt).toUTCString(),
      guid: isUpdate ? `${BASE_URL}/profile/${item.slug}#update-${item.publishedAt}` : `${BASE_URL}/profile/${item.slug}`,
      category: item.city ?? "General",
    };
  });

  return {
    title: "Geothority — Latest Business Profile Reports",
    link: `${BASE_URL}/profiles/feed`,
    description: "Recently analyzed local businesses on Geothority with Geothority Scores and SEO insights.",
    language: "en-us",
    lastBuildDate: new Date().toUTCString(),
    items: rssItems,
  };
}

export function renderRSSXml(feed: RSSFeed): string {
  const items = feed.items
    .map(
      (item) => `    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="true">${item.guid}</guid>
      ${item.category ? `<category>${item.category}</category>` : ""}
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${feed.title}</title>
    <link>${feed.link}</link>
    <description>${feed.description}</description>
    <language>${feed.language}</language>
    <lastBuildDate>${feed.lastBuildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}/profiles/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}
