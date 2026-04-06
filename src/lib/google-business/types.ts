// ============================================================
// Google Business Profile — Complete Data Model
// ============================================================

// ---------- Core GBP Identity ----------
export interface GBPProfile {
  id: string; // our internal UUID
  user_id: string;
  google_account_id: string; // accounts/{accountId}
  google_location_id: string; // locations/{locationId}
  business_name: string;

  // Primary info
  primary_phone: string | null;
  primary_category: string | null;
  additional_categories: string[];
  website_url: string | null;
  description: string | null;

  // Address
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;

  // Status
  verification_status: "VERIFIED" | "UNVERIFIED" | "PENDING" | "SUSPENDED" | null;
  is_open: boolean;

  // Hours
  regular_hours: BusinessHours | null;
  special_hours: SpecialHours[] | null;

  // Media
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  photo_count: number;

  // Attributes / services
  attributes: GBPAttribute[];
  service_items: GBPServiceItem[];

  // Timestamps
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  periods: HoursPeriod[];
}

export interface HoursPeriod {
  openDay: string; // MONDAY, TUESDAY, etc.
  openTime: string; // HH:MM
  closeDay: string;
  closeTime: string;
}

export interface SpecialHours {
  startDate: { year: number; month: number; day: number };
  openTime?: string;
  closeTime?: string;
  isClosed: boolean;
}

export interface GBPAttribute {
  name: string;
  value: string | boolean;
}

export interface GBPServiceItem {
  name: string;
  price?: { currencyCode: string; units: string };
  description?: string;
}

// ---------- Reviews ----------
export interface GBPReview {
  id: string;
  gbp_profile_id: string;
  google_review_id: string;
  reviewer_name: string;
  reviewer_photo_url: string | null;
  star_rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  reply_comment: string | null;
  reply_updated_at: string | null;
  create_time: string;
  update_time: string;
  synced_at: string;
}

// ---------- Posts ----------
export interface GBPPost {
  id: string;
  gbp_profile_id: string;
  google_post_id: string;
  topic_type: "STANDARD" | "EVENT" | "OFFER" | "ALERT";
  summary: string | null;
  media_url: string | null;
  action_type: string | null;
  action_url: string | null;
  event_start: string | null;
  event_end: string | null;
  create_time: string;
  synced_at: string;
}

// ---------- Q&A ----------
export interface GBPQA {
  id: string;
  gbp_profile_id: string;
  google_question_id: string;
  question_text: string;
  author_name: string;
  answer_text: string | null;
  answer_author_name: string | null;
  create_time: string;
  synced_at: string;
}

// ---------- Insights / Metrics ----------
export interface GBPInsights {
  id: string;
  gbp_profile_id: string;
  period_start: string;
  period_end: string;

  // Search metrics
  search_views: number | null;
  maps_views: number | null;
  total_searches: number | null;

  // Actions
  website_clicks: number | null;
  phone_calls: number | null;
  direction_requests: number | null;
  message_count: number | null;
  booking_clicks: number | null;

  // Photos
  photo_views_merchant: number | null;
  photo_views_customer: number | null;

  created_at: string;
}

// ---------- Audit Scores ----------
export interface GBPAuditResult {
  id: string;
  gbp_profile_id: string;
  user_id: string;

  // Overall
  completeness_score: number; // 0-100
  review_health_score: number; // 0-100
  engagement_score: number; // 0-100
  overall_score: number; // 0-100

  // Completeness breakdown
  has_description: boolean;
  has_phone: boolean;
  has_website: boolean;
  has_hours: boolean;
  has_categories: boolean;
  has_photos: boolean;
  has_attributes: boolean;
  has_services: boolean;

  // Review breakdown
  total_reviews: number;
  average_rating: number;
  reviews_last_30_days: number;
  review_response_rate: number; // 0-1
  avg_response_time_hours: number | null;
  negative_review_count: number;

  // Engagement
  posts_last_30_days: number;
  questions_unanswered: number;

  // Recommendations
  recommendations: AuditRecommendation[];

  created_at: string;
}

export interface AuditRecommendation {
  category: "completeness" | "reviews" | "engagement" | "photos" | "posts";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact_label: string;
}

// ---------- Weekly Metrics Snapshot ----------
export interface GBPWeeklyMetrics {
  id: string;
  gbp_profile_id: string;
  week_start: string;
  week_end: string;
  total_reviews: number;
  new_reviews: number;
  average_rating: number;
  review_response_rate: number;
  search_views: number | null;
  maps_views: number | null;
  website_clicks: number | null;
  phone_calls: number | null;
  direction_requests: number | null;
  completeness_score: number;
  overall_score: number;
  created_at: string;
}

// ---------- Sync Status ----------
export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface GBPSyncState {
  status: SyncStatus;
  last_synced_at: string | null;
  error_message: string | null;
}
