"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

interface AchievementCheck {
  scanScore?: number;
  quickWinsDone?: number;
  scanCount?: number;
  previousScore?: number;
}

const STORAGE_PREFIX = "geo-achievement-";

function hasEarned(key: string): boolean {
  try { return localStorage.getItem(STORAGE_PREFIX + key) === "1"; } catch { return false; }
}

function markEarned(key: string) {
  try { localStorage.setItem(STORAGE_PREFIX + key, "1"); } catch { /* ignore */ }
}

// Queue one achievement toast — no stacking, single queue
let pending: { title: string; description: string; icon: string } | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function queueAchievement(icon: string, title: string, description: string) {
  // Only show if nothing already pending to prevent pile-up
  if (pending || toastTimer) return;
  pending = { title, description, icon };
  toastTimer = setTimeout(() => {
    if (pending) {
      toast({
        title: `${pending.icon} ${pending.title}`,
        description: pending.description,
        // auto-dismiss after 4s via duration on ToastProvider
      });
      pending = null;
    }
    toastTimer = null;
  }, 600);
}

export function useAchievements({ scanScore, quickWinsDone, scanCount, previousScore }: AchievementCheck) {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    // First scan complete
    if (scanCount && scanCount >= 1 && !hasEarned("first-scan")) {
      markEarned("first-scan");
      queueAchievement("✓", "First scan complete", "Your Local Trust Stack baseline is set.");
      return;
    }

    // Score above 70
    if (scanScore && scanScore >= 70 && !hasEarned("score-70")) {
      markEarned("score-70");
      queueAchievement("↑", "Strong foundation", `Score above 70 — you're ahead of most local businesses.`);
      return;
    }

    // Score improvement
    if (scanScore && previousScore && scanScore > previousScore) {
      const delta = scanScore - previousScore;
      if (delta >= 3) {
        queueAchievement("↑", `+${delta} points`, "Your Trust Stack score improved since last scan.");
        return;
      }
    }

    // All quick wins done
    if (quickWinsDone && quickWinsDone >= 3 && !hasEarned("wins-3")) {
      markEarned("wins-3");
      queueAchievement("✓", "Quick wins streak", "3 quick wins completed — keep the momentum.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
