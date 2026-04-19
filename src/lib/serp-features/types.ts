// SERP Feature Optimization Module — Types & Interfaces

export type SerpFeatureType = 'local_pack' | 'featured_snippet' | 'knowledge_panel' | 'people_also_ask' | 'image_pack' | 'video_carousel';

export type SnippetFormat = 'paragraph' | 'bulleted_list' | 'numbered_list' | 'table';

export type Competitiveness = 'low' | 'medium' | 'high';

export interface SerpAnalysisResult {
  keyword: string;
  location: string;
  analyzedAt: string;
  features: DetectedFeature[];
  opportunities: SerpOpportunity[];
}

export interface DetectedFeature {
  type: SerpFeatureType;
  present: boolean;
  currentHolder?: string;
  currentHolderUrl?: string;
  snippetFormat?: SnippetFormat;
  snippetContent?: string;
  position?: number;
}

export interface SerpOpportunity {
  keyword: string;
  featureType: SerpFeatureType;
  competitiveness: Competitiveness;
  difficulty: number; // 0-100
  estimatedImpact: number; // 0-100 projected traffic lift
  strategy: SerpStrategy;
  contentRecommendations: ContentRecommendation[];
  gbpDataPoints: GbpDataPoint[];
  priority: number; // 0-100
}

export interface SerpStrategy {
  type: 'content_structure' | 'gbp_optimization' | 'schema_enhancement' | 'citation_improvement' | 'review_strategy';
  title: string;
  description: string;
  actions: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface ContentRecommendation {
  format: SnippetFormat;
  heading: string;
  suggestedContent: string;
  targetWordCount: number;
  schemaMarkup: string;
  placementAdvice: string;
}

export interface GbpDataPoint {
  field: string;
  currentValue?: string;
  recommendedValue: string;
  reason: string;
  priority: 'critical' | 'important' | 'nice_to_have';
}

export interface SerpFeatureReport {
  businessName: string;
  location: string;
  generatedAt: string;
  overallScore: number;
  localPackReadiness: number;
  snippetReadiness: number;
  opportunities: SerpOpportunity[];
  quickWins: SerpOpportunity[];
  longTermPlays: SerpOpportunity[];
  contentPieces: ContentPiece[];
}

export interface ContentPiece {
  id: string;
  title: string;
  targetKeyword: string;
  targetFeature: SerpFeatureType;
  format: SnippetFormat;
  outline: string[];
  snippetOptimizedSection: string;
  schemaMarkup: string;
  gbpActions: string[];
  estimatedTrafficLift: number;
}
