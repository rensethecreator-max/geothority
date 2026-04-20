"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentSkeleton } from "@/components/shared/loading-skeleton";
import {
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Loader2,
  Check,
  Lock,
  RefreshCw,
  Shield,
  ArrowRight,
  ExternalLink,
  Search,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────

interface DirectoryState {
  id: string;
  name: string;
  icon: string;
  tier: string;
  syncMode: "direct" | "distribution" | "guided" | "unknown";
  distributionSource?: string;
  checkMethod: string;
  claimUrl: string | null;
  syncStatus: "unchecked" | "found" | "mismatch" | "not_found" | "syncing" | "synced" | "failed" | "claim_needed";
  listingFound: boolean | null;
  nameMatch: boolean | null;
  addressMatch: boolean | null;
  phoneMatch: boolean | null;
  consistencyScore: number | null;
  listingUrl: string | null;
  lastChecked: string | null;
  lastSynced: string | null;
  driftDetected: boolean;
  driftDetails: Record<string, any>;
  fixSteps: string[];
}

interface CitationTruthResponse {
  hasProfile: boolean;
  profile: any;
  directories: DirectoryState[];
  summary: {
    total: number;
    checked: number;
    found: number;
    mismatches: number;
    notFound: number;
    driftAlerts: number;
    avgConsistency: number | null;
  };
  syncModes: {
    direct: { count: number; label: string; description: string };
    distribution: { count: number; label: string; description: string };
    guided: { count: number; label: string; description: string };
    unknown: { count: number; label: string; description: string };
  };
  recentDrift: any[];
}

const SYNC_MODE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  direct: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Auto-sync" },
  distribution: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Distribution" },
  guided: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Guided" },
  unknown: { bg: "bg-gray-500/10", text: "text-gray-400", label: "Check only" },
};

const STATUS_STYLES: Record<string, { icon: any; color: string; label: string }> = {
  found: { icon: CheckCircle2, color: "text-emerald-400", label: "Listed" },
  synced: { icon: CheckCircle2, color: "text-emerald-400", label: "Synced" },
  mismatch: { icon: AlertCircle, color: "text-amber-400", label: "Mismatch" },
  not_found: { icon: XCircle, color: "text-red-400", label: "Not found" },
  unchecked: { icon: Search, color: "text-gray-400", label: "Not checked" },
  claim_needed: { icon: Lock, color: "text-amber-400", label: "Claim needed" },
  syncing: { icon: Loader2, color: "text-blue-400", label: "Syncing" },
  failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
};

function DirectoryCard({ dir, onCheck }: { dir: DirectoryState; onCheck: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const modeStyle = SYNC_MODE_STYLES[dir.syncMode] ?? SYNC_MODE_STYLES.unknown;
  const statusStyle = STATUS_STYLES[dir.syncStatus] ?? STATUS_STYLES.unchecked;
  const StatusIcon = statusStyle.icon;

  const needsAction = dir.syncStatus === "not_found" || dir.syncStatus === "mismatch" || dir.syncStatus === "claim_needed" || dir.driftDetected;

  return (
    <div className={`bg-[var(--card)] rounded-xl border p-4 ${dir.driftDetected ? "border-amber-500/30" : needsAction ? "border-red-500/20" : "border-[var(--border)]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{dir.icon}</span>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{dir.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${modeStyle.bg} ${modeStyle.text}`}>
                {modeStyle.label}
              </span>
              {dir.tier === "major" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-electric-500/10 text-electric-500">
                  Priority
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {dir.consistencyScore !== null && (
            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
              dir.consistencyScore >= 80 ? "text-emerald-400 bg-emerald-500/10" :
              dir.consistencyScore >= 50 ? "text-amber-400 bg-amber-500/10" :
              "text-red-400 bg-red-500/10"
            }`}>
              {dir.consistencyScore}%
            </div>
          )}
          <StatusIcon className={`w-4 h-4 ${statusStyle.color} ${dir.syncStatus === "syncing" ? "animate-spin" : ""}`} />
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-3 mt-3 text-xs text-[var(--muted-foreground)]">
        <span className={statusStyle.color}>{statusStyle.label}</span>
        {dir.driftDetected && (
          <span className="text-amber-400 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Drift detected
          </span>
        )}
        {dir.lastChecked && (
          <span className="ml-auto">Checked {new Date(dir.lastChecked).toLocaleDateString()}</span>
        )}
      </div>

      {/* Actions */}
      {needsAction && (
        <div className="mt-3 flex flex-wrap gap-2">
          {dir.claimUrl && (
            <a
              href={dir.claimUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium transition-colors"
            >
              {dir.syncStatus === "not_found" ? "Add Listing" : "Fix This"}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {dir.fixSteps.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              {expanded ? "Hide" : "Show"} steps
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      )}

      {expanded && dir.fixSteps.length > 0 && (
        <ol className="mt-2 ml-4 space-y-1 text-xs text-[var(--muted-foreground)] list-decimal">
          {dir.fixSteps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      )}
    </div>
  );
}

export default function CitationsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<CitationTruthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkForm, setCheckForm] = useState({
    businessName: "",
    address: "",
    phone: "",
    city: "",
    state: "",
  });
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/citations/truth", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load citations");
      setData(json);
      setError(null);

      // Pre-fill form from profile
      if (json.profile) {
        setCheckForm({
          businessName: json.profile.business_name || "",
          address: json.profile.address || "",
          phone: json.profile.phone || "",
          city: json.profile.city || "",
          state: json.profile.state || "",
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkForm.businessName || !checkForm.city || !checkForm.state) return;
    setChecking(true);
    try {
      // Run the citation check
      const checkRes = await fetch("/api/citations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkForm),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok) throw new Error(checkData.error || "Check failed");

      // Save results to truth model
      await fetch("/api/citations/truth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citations: checkData.citations,
          businessProfileId: data?.profile?.id,
        }),
      });

      // Save business profile if not exists
      if (!data?.hasProfile) {
        await fetch("/api/business-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(checkForm),
        });
      }

      // Reload truth model
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleSync = async () => {
    if (!checkForm.businessName || !checkForm.city || !checkForm.state) return;
    setRefreshing(true);
    try {
      await fetch("/api/citations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: checkForm.businessName,
          address: checkForm.address,
          city: checkForm.city,
          state: checkForm.state,
          phone: checkForm.phone,
        }),
      });
      await load();
    } catch {
      // handled by reload
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <ContentSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-electric-500" />
            Citation Control Center
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Track your NAP consistency, sync states, and drift across directories
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium hover:bg-white/5 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Check form (if no profile or user wants to re-check) */}
      {(!data?.hasProfile || !data?.summary.checked) && (
        <form onSubmit={handleCheck} className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 space-y-4">
          <h2 className="font-semibold">Check Your Citations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Business Name <span className="text-red-400">*</span></label>
              <input type="text" value={checkForm.businessName} onChange={(e) => setCheckForm({ ...checkForm, businessName: e.target.value })} placeholder="e.g. Acme Plumbing" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">City <span className="text-red-400">*</span></label>
              <input type="text" value={checkForm.city} onChange={(e) => setCheckForm({ ...checkForm, city: e.target.value })} placeholder="e.g. Austin" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">State <span className="text-red-400">*</span></label>
              <input type="text" value={checkForm.state} onChange={(e) => setCheckForm({ ...checkForm, state: e.target.value })} placeholder="e.g. TX" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input type="text" value={checkForm.phone} onChange={(e) => setCheckForm({ ...checkForm, phone: e.target.value })} placeholder="e.g. (512) 555-1234" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Address</label>
              <input type="text" value={checkForm.address} onChange={(e) => setCheckForm({ ...checkForm, address: e.target.value })} placeholder="e.g. 123 Main St" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" />
            </div>
          </div>
          <button type="submit" disabled={checking} className="flex items-center gap-2 px-5 py-2.5 bg-electric-500 hover:bg-electric-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {checking ? "Checking directories…" : "Check Citations"}
          </button>
        </form>
      )}

      {/* Summary */}
      {data && data.summary.checked > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{data.summary.found}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">Found & Correct</div>
            </div>
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{data.summary.mismatches}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">Mismatches</div>
            </div>
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{data.summary.notFound}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">Not Found</div>
            </div>
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 text-center">
              <div className="text-2xl font-bold">{data.summary.avgConsistency ?? "—"}%</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">Avg Consistency</div>
            </div>
          </div>

          {/* Sync mode honesty layer */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
            <h2 className="font-semibold mb-3">Sync Capabilities</h2>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              We&apos;re transparent about what we can automate vs what requires manual work
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(data.syncModes).map(([key, mode]) => (
                <div key={key} className="rounded-lg border border-[var(--border)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      key === "direct" ? "bg-emerald-400" :
                      key === "distribution" ? "bg-blue-400" :
                      key === "guided" ? "bg-amber-400" : "bg-gray-400"
                    }`} />
                    <span className="text-sm font-medium">{mode.count}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{mode.label}</span>
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">{mode.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Drift alerts */}
          {data.summary.driftAlerts > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h2 className="font-semibold text-amber-400 flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4" />
                {data.summary.driftAlerts} Drift Alert{data.summary.driftAlerts !== 1 ? "s" : ""}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                Your business info has changed since some directories were last checked. Re-verify to stay consistent.
              </p>
              <button
                onClick={handleCheck}
                disabled={checking}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Re-check All
              </button>
            </div>
          )}

          {/* Foursquare sync banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl border border-emerald-500/20 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  Sync to 50+ Directories
                </h3>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  One click pushes your business info to the Foursquare data network, feeding Bing, Samsung, Uber, HERE Maps, and more.
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={refreshing}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {refreshing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>

          {/* Directory list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Directory Status</h2>
              <button
                onClick={(e: React.FormEvent) => { e.preventDefault(); void handleCheck(e); }}
                disabled={checking}
                className="text-xs text-electric-500 hover:text-electric-600 transition-colors flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${checking ? "animate-spin" : ""}`} />
                Re-check all
              </button>
            </div>
            <div className="grid gap-3">
              {data.directories.map((dir) => (
                <DirectoryCard key={dir.id} dir={dir} onCheck={() => {}} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
