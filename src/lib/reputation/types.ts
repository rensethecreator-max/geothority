export interface ReputationProofAssetPreview {
  id: string;
  snippet: string;
  approved: boolean;
  created_at: string;
}

export interface ReputationProofSummary {
  totalRequests: number;
  publicReady: number;
  awaitingReply: number;
  averageScore: number | null;
  proofAssets: ReputationProofAssetPreview[];
}
