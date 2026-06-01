import type { QuickWin, Scan, UserProfile } from "@/lib/types";

export type TrustLayerKey = "layer1" | "layer2" | "layer3" | "layer4" | "layer5";

export const DEFAULT_LAYER_SCORES: Record<TrustLayerKey, number> = {
  layer1: 0,
  layer2: 0,
  layer3: 0,
  layer4: 0,
  layer5: 0,
};

export const LAYER_LABELS: Record<TrustLayerKey, string> = {
  layer1: "GBP authority",
  layer2: "Website trust",
  layer3: "Citation consistency",
  layer4: "Review momentum",
  layer5: "Content coverage",
};

export const DIAGNOSIS_BY_LAYER: Record<TrustLayerKey, { headline: string; detail: string; paidUnlock: string }> = {
  layer1: {
    headline: "Your GBP authority is lagging behind your baseline.",
    detail: "That usually means Geothority needs live profile data, refresh reliability, and more consistent local activity signals.",
    paidUnlock: "Paid tiers make the GBP and monitoring workflows more useful once the connection is live.",
  },
  layer2: {
    headline: "Website trust signals are the main drag on your score.",
    detail: "Missing or weak trust pages make the business look less complete to both Google and AI systems.",
    paidUnlock: "Higher plans make it easier to generate, monitor, and operationalize those missing trust assets.",
  },
  layer3: {
    headline: "Citation consistency is the clearest gap right now.",
    detail: "When listings drift, the local trust graph gets noisy and your authority weakens market-wide.",
    paidUnlock: "Upgrade value here is sync, monitoring, and faster response across a bigger directory surface.",
  },
  layer4: {
    headline: "Review momentum is below where it should be.",
    detail: "Fresh review velocity and better feedback routing can lift both trust and conversion.",
    paidUnlock: "This is where a fully activated Reputation Engine compounds the fastest.",
  },
  layer5: {
    headline: "Content coverage and AEO signals are underdeveloped.",
    detail: "You likely need stronger location/service coverage and clearer machine-readable trust signals.",
    paidUnlock: "The paid content and monitoring layers are most valuable once this becomes the bottleneck.",
  },
};

export function getLayerScores(layerScores: Scan["layer_scores"] | null | undefined): Record<TrustLayerKey, number> {
  return { ...DEFAULT_LAYER_SCORES, ...(layerScores ?? {}) };
}

export function getTopLayer(layerScores: Record<TrustLayerKey, number>) {
  return Object.entries(layerScores).sort((a, b) => b[1] - a[1])[0] as [TrustLayerKey, number] | undefined;
}

export function getWeakestLayer(layerScores: Record<TrustLayerKey, number>) {
  return Object.entries(layerScores).sort((a, b) => a[1] - b[1])[0] as [TrustLayerKey, number] | undefined;
}

export function getWeakestLayerDiagnosis(layerScores: Record<TrustLayerKey, number>) {
  const weakestLayer = getWeakestLayer(layerScores);
  return weakestLayer ? DIAGNOSIS_BY_LAYER[weakestLayer[0]] : null;
}

export function isEntryPlan(plan?: UserProfile["plan"] | null) {
  return !plan || ["free", "audit", "starter"].includes(plan);
}

export function getLaunchStepsLive(gbpConnected: boolean, reputationActivated: boolean) {
  return [true, gbpConnected, reputationActivated].filter(Boolean).length;
}

export function getQuickWinCount(quickWins: QuickWin[] | null | undefined) {
  return quickWins?.length ?? 0;
}
