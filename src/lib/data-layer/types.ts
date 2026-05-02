/**
 * Data Layer types for Geothority's public structured data publishing.
 * Phase 6: Making Geothority a crawlable, authoritative source of truth.
 */

export interface PublicBusinessProfile {
  slug: string;
  businessName: string;
  description: string;
  url: string;
  city: string | null;
  state: string | null;
  address: string | null;
  phone: string | null;
  category: string | null;
  geothorityScore: number | null;
  geoReadinessScore: number | null;
  layerScores: Record<string, number> | null;
  quickWins: PublicQuickWin[] | null;
  competitorGaps: PublicCompetitorGap[] | null;
  proofSummary?: {
    totalRequests: number;
    publicReady: number;
    awaitingReply: number;
    averageScore: number | null;
    proofAssets: Array<{ id: string; snippet: string; approved: boolean; created_at: string }>;
  } | null;
  schemaMarkup: SchemaMarkupOutput;
  lastScanned: string;
  publishedAt: string;
}

export interface PublicQuickWin {
  title: string;
  impact: "high" | "medium" | "low";
  layer: number;
}

export interface PublicCompetitorGap {
  domain: string;
  businessName: string;
  advantage: string;
}

export interface SchemaMarkupOutput {
  business: Record<string, unknown>;
  webpage: Record<string, unknown>;
  breadcrumb: Record<string, unknown>;
  faq?: Record<string, unknown>;
  aggregateRating?: Record<string, unknown>;
}

export interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
}

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  category?: string;
}

export interface RSSFeed {
  title: string;
  link: string;
  description: string;
  language: string;
  lastBuildDate: string;
  items: RSSItem[];
}
