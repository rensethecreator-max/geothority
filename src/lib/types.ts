export interface UserProfile {
  id: string;
  business_name: string | null;
  city: string | null;
  state: string | null;
  website_url: string | null;
  plan: "free" | "audit" | "starter" | "growth" | "authority" | "agency" | "pro";
  onboarding_completed: boolean;
  stripe_customer_id: string | null;
  cms_type: "wordpress" | "wix" | "squarespace" | null;
  cms_credentials: Record<string, string> | null;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  url: string;
  business_name: string | null;
  city: string | null;
  state: string | null;
  geothority_score: number | null;
  geo_readiness_score: number | null;
  layer_scores: {
    layer1: number;
    layer2: number;
    layer3: number;
    layer4: number;
    layer5: number;
  } | null;
  quick_wins: QuickWin[] | null;
  competitor_gaps: CompetitorGap[] | null;
  raw_scan_data: Record<string, any> | null;
  created_at: string;
}

export interface QuickWin {
  title: string;
  description: string;
  copyText: string;
  impact: "high" | "medium" | "low";
  layer: number;
}

export interface CompetitorGap {
  domain: string;
  businessName: string;
  advantage: string;
  score: number;
}

export interface GeneratedContent {
  id: string;
  user_id: string;
  scan_id: string | null;
  type: "landing_page" | "blog_post" | "service_page" | "localized_faq" | "trust_page" | "about";
  city: string | null;
  service: string | null;
  title: string | null;
  meta_description: string | null;
  content_html: string | null;
  content_markdown: string | null;
  schema_json: Record<string, any> | null;
  quality_score: number | null;
  status: "draft" | "published";
  published_at: string | null;
  cms_post_id: string | null;
  created_at: string;
}

export interface Competitor {
  id: string;
  user_id: string;
  domain: string;
  business_name: string | null;
  city: string | null;
  rank_position: number | null;
  last_checked: string | null;
  alerts: CompetitorAlert[];
  created_at: string;
}

export interface CompetitorAlert {
  type: "new_page" | "review_burst" | "rank_change";
  title: string;
  description: string;
  detected_at: string;
  severity: "info" | "warning" | "critical";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const LAYER_NAMES: Record<number, string> = {
  1: "Foundation (NAP/GBP)",
  2: "Trust Pages",
  3: "Geo Content",
  4: "Reviews",
  5: "AI Optimization",
};

export const LAYER_DESCRIPTIONS: Record<number, string> = {
  1: "Name, Address, Phone consistency & Google Business Profile",
  2: "About, Service Areas, Licensing, FAQ pages",
  3: "City-specific & service+location landing pages",
  4: "Review velocity, recency & response rate",
  5: "Schema markup, entity density & GEO signals",
};
