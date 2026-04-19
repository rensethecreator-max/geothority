// Smart Expansion Layer — Phase 7
// AI-driven identification of high-impact cities, services, and niche directories for expansion

export interface ExpansionTarget {
  id: string;
  user_id: string;
  type: "city" | "service" | "niche_directory";
  name: string;
  state: string | null;
  slug: string;
  impact_score: number; // 0-100 composite
  confidence: "high" | "medium" | "low";
  status: "identified" | "researching" | "ready" | "in_progress" | "completed" | "deprioritized";
  rationale: string; // AI-generated explanation
  signals: ExpansionSignal[];
  suggested_actions: SuggestedAction[];
  estimated_traffic_lift: number | null; // monthly organic visits
  estimated_revenue_impact: number | null; // monthly $
  competitor_presence: CompetitorPresence[];
  created_at: string;
  updated_at: string;
}

export interface ExpansionSignal {
  type:
    | "population_density"
    | "search_volume"
    | "competitor_gap"
    | "service_demand"
    | "directory_authority"
    | "proximity_to_existing"
    | "review_density_gap"
    | "serp_feature_opportunity"
    | "ai_citation_gap"
    | "seasonal_trend";
  source: string;
  value: number;
  weight: number; // how much this signal contributes to impact_score
  raw_data: Record<string, unknown> | null;
  fetched_at: string;
}

export interface SuggestedAction {
  type:
    | "create_service_page"
    | "create_city_page"
    | "claim_directory_listing"
    | "build_local_citations"
    | "generate_content"
    | "add_schema_markup"
    | "optimize_gbp_category"
    | "create_gbp_post"
    | "request_reviews"
    | "launch_local_ads";
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  estimated_impact: number; // 0-100
  dependencies: string[]; // ids of other actions that must complete first
  auto_executable: boolean; // can this be done without user approval?
}

export interface CompetitorPresence {
  competitor_domain: string;
  competitor_name: string | null;
  rank_position: number | null;
  has_dedicated_page: boolean;
  directory_listed: boolean;
  review_count: number | null;
  last_seen: string | null;
}

export interface ExpansionRecommendation {
  user_id: string;
  business_name: string;
  current_city: string | null;
  current_state: string | null;
  current_services: string[];
  top_city_targets: ExpansionTarget[];
  top_service_targets: ExpansionTarget[];
  top_directory_targets: ExpansionTarget[];
  priority_matrix: PriorityMatrix;
  generated_at: string;
}

export interface PriorityMatrix {
  cities: { name: string; impact: number; effort: number; quadrant: "quick_win" | "major_project" | "fill_in" | "deprioritize" }[];
  services: { name: string; impact: number; effort: number; quadrant: "quick_win" | "major_project" | "fill_in" | "deprioritize" }[];
}

export interface ExpansionProgress {
  target_id: string;
  actions_completed: number;
  actions_total: number;
  completion_pct: number;
  last_action_at: string | null;
  measurable_results: MeasurableResult[];
}

export interface MeasurableResult {
  metric: string;
  before: number | null;
  after: number | null;
  measured_at: string;
}

export const EXPANSION_CONFIG = {
  MAX_TARGETS_PER_TYPE: 20,
  MIN_IMPACT_SCORE: 25,
  SIGNAL_WEIGHTS: {
    search_volume: 0.20,
    competitor_gap: 0.18,
    proximity_to_existing: 0.15,
    service_demand: 0.15,
    population_density: 0.10,
    directory_authority: 0.08,
    review_density_gap: 0.07,
    serp_feature_opportunity: 0.04,
    ai_citation_gap: 0.03,
    seasonal_trend: 0.0,
  },
  CONFIDENCE_THRESHOLDS: {
    high: 70,   // impact_score >= 70
    medium: 45, // 45-69
    low: 0,     // <45
  },
  EFFORT_ESTIMATION: {
    create_city_page: "medium",
    create_service_page: "medium",
    claim_directory_listing: "low",
    build_local_citations: "medium",
    generate_content: "medium",
    add_schema_markup: "low",
    optimize_gbp_category: "low",
    create_gbp_post: "low",
    request_reviews: "low",
    launch_local_ads: "high",
  },
} as const;
