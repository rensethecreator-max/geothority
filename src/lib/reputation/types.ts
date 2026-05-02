export interface ReputationProofAssetPreview {
  id: string;
  snippet: string;
  approved: boolean;
  created_at: string;
  topic?: string | null;
  published_to?: string[] | null;
}

export interface ReputationProofSummary {
  totalRequests: number;
  publicReady: number;
  awaitingReply: number;
  averageScore: number | null;
  approvedProofCount: number;
  pendingProofCount: number;
  proofAssets: ReputationProofAssetPreview[];
}
