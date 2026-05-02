export interface ReputationProofAssetPreview {
  id: string;
  snippet: string;
  approved: boolean;
  created_at: string;
  topic?: string | null;
  published_to?: string[] | null;
}

export interface ReputationRecoverySummary {
  totalFeedback: number;
  unresolved: number;
  reviewing: number;
  resolved: number;
  highSeverity: number;
}

export interface ReputationSourcePerformance {
  triggerSource: string;
  requestsSent: number;
  repliedCount: number;
  positiveCount: number;
  proofCount: number;
  feedbackCount: number;
  replyRate: number;
  positiveRate: number;
}

export interface ReputationAnalyticsSummary {
  requestsSent: number;
  repliedCount: number;
  positiveCount: number;
  proofGeneratedCount: number;
  replyRate: number;
  positiveRate: number;
  proofGenerationRate: number;
  recovery: ReputationRecoverySummary;
  sourcePerformance: ReputationSourcePerformance[];
}

export interface ReputationProofSummary {
  totalRequests: number;
  publicReady: number;
  awaitingReply: number;
  averageScore: number | null;
  approvedProofCount: number;
  pendingProofCount: number;
  proofAssets: ReputationProofAssetPreview[];
  analytics: ReputationAnalyticsSummary;
}
