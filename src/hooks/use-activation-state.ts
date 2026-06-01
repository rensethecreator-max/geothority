"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getLayerScores,
  getLaunchStepsLive,
  getQuickWinCount,
  getWeakestLayer,
  getWeakestLayerDiagnosis,
} from "@/lib/activation-diagnosis";
import type { Scan } from "@/lib/types";

interface ActivationStateOptions {
  scan?: Scan | null;
  fetchLatestScan?: boolean;
  enabled?: boolean;
}

interface GbpStatusSnapshot {
  googleConnected?: boolean;
  hasSyncedProfile?: boolean;
}

interface ReputationSettingsSnapshot {
  settings?: {
    active?: boolean;
    googleReviewLink?: string;
  };
}

interface ActivationStatePayload {
  latestScan: Scan | null;
  gbpConnected: boolean;
  reputationActivated: boolean;
}

export function useActivationState(options?: ActivationStateOptions) {
  const { scan = null, fetchLatestScan = true, enabled = true } = options ?? {};

  const query = useQuery<ActivationStatePayload>({
    queryKey: ["/activation/state", scan?.id ?? "latest", fetchLatestScan],
    enabled,
    queryFn: async () => {
      const requests = [
        fetch("/api/gbp/status", { cache: "no-store" }).catch(() => null),
        fetch("/api/reputation/settings", { cache: "no-store" }).catch(() => null),
      ] as const;

      const [gbpRes, reputationRes, scanRes] = await Promise.all([
        ...requests,
        fetchLatestScan ? fetch("/api/scan", { cache: "no-store" }).catch(() => null) : Promise.resolve(null),
      ]);

      const gbpJson = gbpRes?.ok ? ((await gbpRes.json().catch(() => ({}))) as GbpStatusSnapshot) : null;
      const reputationJson = reputationRes?.ok ? ((await reputationRes.json().catch(() => ({}))) as ReputationSettingsSnapshot) : null;
      const scansJson = scanRes?.ok ? await scanRes.json().catch(() => ({ scans: [] })) : { scans: [] };

      return {
        latestScan: scan ?? scansJson.scans?.[0] ?? null,
        gbpConnected: Boolean(gbpJson?.googleConnected || gbpJson?.hasSyncedProfile),
        reputationActivated: Boolean(reputationJson?.settings?.active || reputationJson?.settings?.googleReviewLink),
      };
    },
  });

  const latestScan = query.data?.latestScan ?? scan ?? null;
  const gbpConnected = query.data?.gbpConnected ?? false;
  const reputationActivated = query.data?.reputationActivated ?? false;
  const layerScores = getLayerScores(latestScan?.layer_scores);
  const weakestLayer = latestScan ? getWeakestLayer(layerScores) : null;
  const weakestLayerDiagnosis = latestScan ? getWeakestLayerDiagnosis(layerScores) : null;
  const quickWinCount = getQuickWinCount(latestScan?.quick_wins);
  const launchStepsLive = getLaunchStepsLive(gbpConnected, reputationActivated);

  return {
    ...query,
    latestScan,
    gbpConnected,
    reputationActivated,
    layerScores,
    weakestLayer,
    weakestLayerDiagnosis,
    quickWinCount,
    launchStepsLive,
    hasScan: Boolean(latestScan?.id),
  };
}
