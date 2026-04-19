"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  MapPin,
  Wrench,
  FolderOpen,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Target,
  BarChart3,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

interface ExpansionTarget {
  id: string;
  type: "city" | "service" | "niche_directory";
  name: string;
  state: string | null;
  impact_score: number;
  confidence: "high" | "medium" | "low";
  status: string;
  rationale: string;
  suggested_actions: SuggestedAction[];
  estimated_traffic_lift: number | null;
  estimated_revenue_impact: number | null;
}

interface SuggestedAction {
  type: string;
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  estimated_impact: number;
  auto_executable: boolean;
}

interface ExpansionDashboard {
  total_targets: number;
  by_type: { cities: number; services: number; directories: number };
  by_status: Record<string, number>;
  total_potential_traffic_lift: number;
  total_potential_revenue_impact: number;
  top_quick_wins: ExpansionTarget[];
}

// ─── Component ─────────────────────────────────────────────────

export default function ExpansionPage() {
  const [dashboard, setDashboard] = useState<ExpansionDashboard | null>(null);
  const [targets, setTargets] = useState<ExpansionTarget[]>([]);
  const [activeTab, setActiveTab] = useState<"city" | "service" | "niche_directory">("city");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/expansion/dashboard");
      if (res.ok) setDashboard(await res.json());
    } catch { /* dashboard optional */ }
  }, []);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expansion/targets?type=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setTargets(data.targets || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { fetchTargets(); }, [fetchTargets]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/expansion/recommendations", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate recommendations");
      await fetchDashboard();
      await fetchTargets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusUpdate = async (targetId: string, status: string) => {
    try {
      await fetch("/api/expansion/targets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, status }),
      });
      await fetchTargets();
      await fetchDashboard();
    } catch { /* silent */ }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_progress": return <Clock className="w-4 h-4 text-blue-500" />;
      case "deprioritized": return <AlertTriangle className="w-4 h-4 text-gray-400" />;
      default: return <Zap className="w-4 h-4 text-yellow-500" />;
    }
  };

  const confidenceBadge = (c: string) => {
    const colors: Record<string, string> = {
      high: "bg-green-500/10 text-green-600",
      medium: "bg-yellow-500/10 text-yellow-600",
      low: "bg-gray-500/10 text-gray-500",
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[c] || colors.low}`}>
        {c}
      </span>
    );
  };

  const tabConfig = [
    { key: "city" as const, label: "Cities", icon: MapPin },
    { key: "service" as const, label: "Services", icon: Wrench },
    { key: "niche_directory" as const, label: "Directories", icon: FolderOpen },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <Target className="w-6 h-6 text-electric-500" />
            Smart Expansion
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            AI-driven city, service, and directory expansion recommendations
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-electric-500 text-white rounded-lg font-medium text-sm hover:bg-electric-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Analyzing..." : "Generate Recommendations"}
        </button>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Targets"
            value={dashboard.total_targets}
            icon={BarChart3}
          />
          <StatCard
            label="Cities / Services / Dirs"
            value={`${dashboard.by_type.cities} / ${dashboard.by_type.services} / ${dashboard.by_type.directories}`}
            icon={MapPin}
          />
          <StatCard
            label="Potential Traffic Lift"
            value={`${(dashboard.total_potential_traffic_lift / 1000).toFixed(1)}K/mo`}
            icon={TrendingUp}
          />
          <StatCard
            label="Potential Revenue"
            value={`$${dashboard.total_potential_revenue_impact.toLocaleString()}/mo`}
            icon={TrendingUp}
            accent
          />
        </div>
      )}

      {/* Quick Wins */}
      {dashboard && dashboard.top_quick_wins && dashboard.top_quick_wins.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" /> Top Quick Wins
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboard.top_quick_wins.map((t) => (
              <div
                key={t.id}
                className="border border-[var(--border)] rounded-lg p-3 hover:border-electric-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--foreground)]">{t.name}</span>
                  {confidenceBadge(t.confidence)}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mb-2">{t.rationale}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-electric-500 font-semibold">Impact: {t.impact_score}</span>
                  {t.estimated_revenue_impact && (
                    <span className="text-green-600">+${t.estimated_revenue_impact}/mo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--muted)] rounded-lg p-1 w-fit">
        {tabConfig.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Target List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading expansion targets...
        </div>
      ) : targets.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <MapPin className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No expansion targets yet</p>
          <p className="text-sm mt-1">Click &ldquo;Generate Recommendations&rdquo; to analyze expansion opportunities.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {targets.map((target) => (
            <div
              key={target.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-electric-500/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {statusIcon(target.status)}
                  <div>
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      {target.name}
                      {target.state && (
                        <span className="text-[var(--muted-foreground)] font-normal">, {target.state}</span>
                      )}
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {target.type.replace("_", " ")} • Status: {target.status.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {confidenceBadge(target.confidence)}
                  <span className="text-lg font-bold text-electric-500">{target.impact_score}</span>
                </div>
              </div>

              <p className="text-sm text-[var(--muted-foreground)] mb-4">{target.rationale}</p>

              {/* Metrics row */}
              <div className="flex gap-6 mb-4 text-sm">
                {target.estimated_traffic_lift != null && (
                  <div>
                    <span className="text-[var(--muted-foreground)]">Traffic: </span>
                    <span className="font-medium text-[var(--foreground)]">+{target.estimated_traffic_lift}/mo</span>
                  </div>
                )}
                {target.estimated_revenue_impact != null && (
                  <div>
                    <span className="text-[var(--muted-foreground)]">Revenue: </span>
                    <span className="font-medium text-green-600">+${target.estimated_revenue_impact}/mo</span>
                  </div>
                )}
              </div>

              {/* Suggested Actions */}
              {target.suggested_actions?.length > 0 && (
                <div className="border-t border-[var(--border)] pt-3">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Suggested Actions</p>
                  <div className="space-y-2">
                    {target.suggested_actions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 mt-1 text-[var(--muted-foreground)] flex-shrink-0" />
                        <div>
                          <p className="text-sm text-[var(--foreground)]">{action.title}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            Effort: {action.effort} • Impact: {action.estimated_impact}
                            {action.auto_executable && " • Auto-executable"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {target.status === "identified" && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleStatusUpdate(target.id, "in_progress")}
                    className="px-3 py-1.5 text-xs font-medium bg-electric-500 text-white rounded-md hover:bg-electric-600 transition-colors"
                  >
                    Start Working
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(target.id, "deprioritized")}
                    className="px-3 py-1.5 text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)] rounded-md hover:text-[var(--foreground)] transition-colors"
                  >
                    Deprioritize
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${accent ? "text-green-500" : "text-electric-500"}`} />
        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      </div>
      <p className={`text-xl font-bold ${accent ? "text-green-600" : "text-[var(--foreground)]"}`}>{value}</p>
    </div>
  );
}
