// Smart Expansion Data Manager — Phase 7
// Persists and manages expansion targets, progress tracking, and lifecycle

import {
  ExpansionTarget,
  ExpansionProgress,
  ExpansionRecommendation,
  MeasurableResult,
} from "./types";
import { generateExpansionRecommendation } from "./expansion-engine";
import type { CityExpansionInput, ServiceExpansionInput, DirectoryExpansionInput } from "./expansion-engine";

// ─── Storage Interface (swap for Supabase in production) ─────────────────────

interface ExpansionStore {
  getTargetById(id: string): Promise<ExpansionTarget | null>;
  getTargets(userId: string, type?: string): Promise<ExpansionTarget[]>;
  saveTarget(target: ExpansionTarget): Promise<ExpansionTarget>;
  updateTarget(id: string, patch: Partial<ExpansionTarget>): Promise<ExpansionTarget>;
  deleteTarget(id: string): Promise<void>;
  getProgress(targetId: string): Promise<ExpansionProgress | null>;
  saveProgress(progress: ExpansionProgress): Promise<void>;
}

// In-memory store for development (replace with Supabase implementation)
class MemoryExpansionStore implements ExpansionStore {
  private targets = new Map<string, ExpansionTarget>();
  private progress = new Map<string, ExpansionProgress>();

  async getTargetById(id: string): Promise<ExpansionTarget | null> {
    return this.targets.get(id) ?? null;
  }

  async getTargets(userId: string, type?: string): Promise<ExpansionTarget[]> {
    const all = Array.from(this.targets.values()).filter((t) => t.user_id === userId);
    return type ? all.filter((t) => t.type === type) : all;
  }

  async saveTarget(target: ExpansionTarget): Promise<ExpansionTarget> {
    this.targets.set(target.id, target);
    return target;
  }

  async updateTarget(id: string, patch: Partial<ExpansionTarget>): Promise<ExpansionTarget> {
    const existing = this.targets.get(id);
    if (!existing) throw new Error(`Target ${id} not found`);
    const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
    this.targets.set(id, updated);
    return updated;
  }

  async deleteTarget(id: string): Promise<void> {
    this.targets.delete(id);
    this.progress.delete(id);
  }

  async getProgress(targetId: string): Promise<ExpansionProgress | null> {
    return this.progress.get(targetId) ?? null;
  }

  async saveProgress(p: ExpansionProgress): Promise<void> {
    this.progress.set(p.target_id, p);
  }
}

// ─── Supabase Store (production) ─────────────────────────────────────────────

class SupabaseExpansionStore implements ExpansionStore {
  constructor(private supabase: any) {}

  async getTargetById(id: string): Promise<ExpansionTarget | null> {
    const { data, error } = await this.supabase.from("expansion_targets").select("*").eq("id", id).single();
    if (error) return null;
    return data;
  }

  async getTargets(userId: string, type?: string): Promise<ExpansionTarget[]> {
    let query = this.supabase.from("expansion_targets").select("*").eq("user_id", userId);
    if (type) query = query.eq("type", type);
    const { data, error } = await query.order("impact_score", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async saveTarget(target: ExpansionTarget): Promise<ExpansionTarget> {
    const { data, error } = await this.supabase.from("expansion_targets").insert(target).select().single();
    if (error) throw error;
    return data;
  }

  async updateTarget(id: string, patch: Partial<ExpansionTarget>): Promise<ExpansionTarget> {
    const { data, error } = await this.supabase
      .from("expansion_targets")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteTarget(id: string): Promise<void> {
    const { error } = await this.supabase.from("expansion_targets").delete().eq("id", id);
    if (error) throw error;
  }

  async getProgress(targetId: string): Promise<ExpansionProgress | null> {
    const { data, error } = await this.supabase
      .from("expansion_progress")
      .select("*")
      .eq("target_id", targetId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  }

  async saveProgress(p: ExpansionProgress): Promise<void> {
    await this.supabase.from("expansion_progress").upsert(p);
  }
}

// ─── Expansion Manager ──────────────────────────────────────────────────────

export class ExpansionManager {
  private store: ExpansionStore;

  constructor(supabaseClient?: any) {
    this.store = supabaseClient ? new SupabaseExpansionStore(supabaseClient) : new MemoryExpansionStore();
  }

  /** Generate and persist a full expansion recommendation for a business */
  async generateAndSave(
    userId: string,
    businessName: string,
    cityInput: CityExpansionInput,
    serviceInput: ServiceExpansionInput,
    dirInput: DirectoryExpansionInput
  ): Promise<ExpansionRecommendation> {
    const recommendation = generateExpansionRecommendation(cityInput, serviceInput, dirInput, userId, businessName);

    // Persist all targets
    const allTargets = [
      ...recommendation.top_city_targets,
      ...recommendation.top_service_targets,
      ...recommendation.top_directory_targets,
    ];

    for (const target of allTargets) {
      await this.store.saveTarget(target);
    }

    return recommendation;
  }

  /** Get all expansion targets for a user, optionally filtered by type */
  async getTargets(userId: string, type?: "city" | "service" | "niche_directory"): Promise<ExpansionTarget[]> {
    return this.store.getTargets(userId, type);
  }

  /** Get only actionable targets (identified or ready) */
  async getActionableTargets(userId: string): Promise<ExpansionTarget[]> {
    const all = await this.store.getTargets(userId);
    return all.filter((t) => t.status === "identified" || t.status === "ready");
  }

  /** Update target status through its lifecycle */
  async updateStatus(targetId: string, status: ExpansionTarget["status"]): Promise<ExpansionTarget> {
    return this.store.updateTarget(targetId, { status });
  }

  /** Mark a suggested action as completed and update progress */
  async completeAction(targetId: string, actionIndex: number, result?: MeasurableResult): Promise<ExpansionProgress> {
    const target = await this.getTargetById(targetId);
    if (!target) throw new Error(`Target ${targetId} not found`);

    const progress = (await this.store.getProgress(targetId)) ?? {
      target_id: targetId,
      actions_completed: 0,
      actions_total: target.suggested_actions.length,
      completion_pct: 0,
      last_action_at: null,
      measurable_results: [],
    };

    progress.actions_completed = Math.min(progress.actions_completed + 1, progress.actions_total);
    progress.completion_pct = Math.round((progress.actions_completed / progress.actions_total) * 100);
    progress.last_action_at = new Date().toISOString();

    if (result) {
      progress.measurable_results.push(result);
    }

    await this.store.saveProgress(progress);

    // Auto-update target status based on progress
    if (progress.completion_pct >= 100) {
      await this.store.updateTarget(targetId, { status: "completed" });
    } else if (progress.completion_pct > 0) {
      await this.store.updateTarget(targetId, { status: "in_progress" });
    }

    return progress;
  }

  /** Deprioritize a target */
  async deprioritize(targetId: string): Promise<ExpansionTarget> {
    return this.store.updateTarget(targetId, { status: "deprioritized" });
  }

  /** Refresh impact scores for all targets (re-run signals) */
  async refreshScores(userId: string): Promise<number> {
    const targets = await this.store.getTargets(userId);
    let updated = 0;

    for (const target of targets) {
      if (target.status === "completed" || target.status === "deprioritized") continue;
      // Recompute from existing signals
      const { computeImpactScore, classifyConfidence } = await import("./expansion-engine");
      const newScore = computeImpactScore(target.signals);
      if (newScore !== target.impact_score) {
        await this.store.updateTarget(target.id, {
          impact_score: newScore,
          confidence: classifyConfidence(newScore),
        });
        updated++;
      }
    }

    return updated;
  }

  /** Get expansion dashboard summary */
  async getDashboard(userId: string): Promise<ExpansionDashboard> {
    const targets = await this.store.getTargets(userId);
    const byType: Record<string, ExpansionTarget[]> = { city: [], service: [], niche_directory: [] };
    for (const t of targets) { if (!byType[t.type]) byType[t.type] = []; byType[t.type].push(t); }

    const byStatus = targets.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalPotentialTraffic = targets.reduce((sum, t) => sum + (t.estimated_traffic_lift ?? 0), 0);
    const totalPotentialRevenue = targets.reduce((sum, t) => sum + (t.estimated_revenue_impact ?? 0), 0);

    return {
      total_targets: targets.length,
      by_type: { cities: byType.city.length, services: byType.service.length, directories: byType.niche_directory.length },
      by_status: byStatus,
      total_potential_traffic_lift: totalPotentialTraffic,
      total_potential_revenue_impact: totalPotentialRevenue,
      top_quick_wins: targets
        .filter((t) => t.status === "identified" && t.impact_score >= 55)
        .sort((a, b) => b.impact_score - a.impact_score)
        .slice(0, 5),
    };
  }

  private async getTargetById(id: string): Promise<ExpansionTarget | null> {
    return this.store.getTargetById(id);
  }

  /** Delete a target entirely */
  async deleteTarget(id: string): Promise<void> {
    return this.store.deleteTarget(id);
  }
}

export interface ExpansionDashboard {
  total_targets: number;
  by_type: { cities: number; services: number; directories: number };
  by_status: Record<string, number>;
  total_potential_traffic_lift: number;
  total_potential_revenue_impact: number;
  top_quick_wins: ExpansionTarget[];
}

// ─── Database Migration SQL ──────────────────────────────────────────────────

export const MIGRATION_SQL = `
-- Smart Expansion Layer tables (Phase 7)

CREATE TABLE IF NOT EXISTS expansion_targets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('city', 'service', 'niche_directory')),
  name TEXT NOT NULL,
  state TEXT,
  slug TEXT NOT NULL,
  impact_score INTEGER NOT NULL DEFAULT 0,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'researching', 'ready', 'in_progress', 'completed', 'deprioritized')),
  rationale TEXT,
  signals JSONB DEFAULT '[]',
  suggested_actions JSONB DEFAULT '[]',
  estimated_traffic_lift INTEGER,
  estimated_revenue_impact INTEGER,
  competitor_presence JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expansion_targets_user ON expansion_targets(user_id);
CREATE INDEX idx_expansion_targets_type ON expansion_targets(user_id, type);
CREATE INDEX idx_expansion_targets_status ON expansion_targets(user_id, status);
CREATE INDEX idx_expansion_targets_impact ON expansion_targets(user_id, impact_score DESC);

CREATE TABLE IF NOT EXISTS expansion_progress (
  target_id TEXT PRIMARY KEY REFERENCES expansion_targets(id) ON DELETE CASCADE,
  actions_completed INTEGER NOT NULL DEFAULT 0,
  actions_total INTEGER NOT NULL DEFAULT 0,
  completion_pct INTEGER NOT NULL DEFAULT 0,
  last_action_at TIMESTAMPTZ,
  measurable_results JSONB DEFAULT '[]'
);

-- RLS policies
ALTER TABLE expansion_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expansion_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own expansion targets" ON expansion_targets
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage own expansion targets" ON expansion_targets
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users see own expansion progress" ON expansion_progress
  FOR SELECT USING (
    target_id IN (SELECT id FROM expansion_targets WHERE user_id = auth.uid())
  );
CREATE POLICY "Users manage own expansion progress" ON expansion_progress
  FOR ALL USING (
    target_id IN (SELECT id FROM expansion_targets WHERE user_id = auth.uid())
  );
`;
