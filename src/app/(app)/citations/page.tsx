"use client";

import { useState } from "react";
import {
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Zap,
  Loader2,
  Check,
  Lock,
} from "lucide-react";

interface CitationResult {
  directory: string;
  url: string;
  found: boolean;
  nameMatch: boolean | null;
  addressMatch: boolean | null;
  phoneMatch: boolean | null;
  consistencyScore: number;
  details: string;
  icon: string;
  claimUrl: string | null;
  fixSteps: string[];
}

interface CitationResponse {
  businessName: string;
  location: string;
  citations: CitationResult[];
  summary: {
    totalDirectories: number;
    foundIn: number;
    overallConsistencyScore: number;
    grade: string;
  };
  recommendations: string[];
}

function CitationCard({ citation }: { citation: CitationResult }) {
  const [expanded, setExpanded] = useState(false);

  const needsFix =
    !citation.found ||
    citation.nameMatch === false ||
    citation.phoneMatch === false ||
    citation.consistencyScore < 80;

  const scoreColor =
    citation.consistencyScore >= 80
      ? "text-emerald-400"
      : citation.consistencyScore >= 50
      ? "text-amber-400"
      : "text-red-400";

  const scoreBg =
    citation.consistencyScore >= 80
      ? "bg-emerald-500/10"
      : citation.consistencyScore >= 50
      ? "bg-amber-500/10"
      : "bg-red-500/10";

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{citation.icon}</span>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{citation.directory}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
              {citation.details}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`px-2 py-1 rounded-lg text-xs font-bold ${scoreColor} ${scoreBg}`}>
            {citation.consistencyScore}%
          </div>
          {citation.found ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>

      {/* Match indicators */}
      <div className="flex gap-3 mt-3 text-xs text-[var(--muted-foreground)]">
        <span className={citation.found ? "text-emerald-400" : "text-red-400"}>
          {citation.found ? "✓ Found" : "✗ Not found"}
        </span>
        {citation.nameMatch !== null && (
          <span className={citation.nameMatch ? "text-emerald-400" : "text-amber-400"}>
            {citation.nameMatch ? "✓ Name" : "⚠ Name"}
          </span>
        )}
        {citation.phoneMatch !== null && (
          <span className={citation.phoneMatch ? "text-emerald-400" : "text-amber-400"}>
            {citation.phoneMatch ? "✓ Phone" : "⚠ Phone"}
          </span>
        )}
        {citation.url && (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 hover:text-[var(--foreground)] transition-colors"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Fix actions — shown when there's an issue */}
      {needsFix && citation.claimUrl && (
        <div className="mt-3 flex flex-col gap-2">
          {!citation.found ? (
            <a
              href={citation.claimUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium transition-colors w-fit"
            >
              Add Your Listing <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <a
              href={citation.claimUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors w-fit"
            >
              Fix This <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {citation.fixSteps.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {!citation.found ? "How to add your listing" : "Step-by-step instructions"}
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              {expanded && (
                <ol className="mt-2 ml-4 space-y-1 text-xs text-[var(--muted-foreground)] list-decimal">
                  {citation.fixSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CitationsPage() {
  const [form, setForm] = useState({
    businessName: "",
    address: "",
    phone: "",
    city: "",
    state: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CitationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/citations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const needsFixCount = result?.citations.filter(
    (c) =>
      !c.found ||
      c.nameMatch === false ||
      c.phoneMatch === false ||
      c.consistencyScore < 80
  ).length ?? 0;

  // Listing Sync state
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    details: string;
    action?: string;
  } | null>(null);

  // Feature flag: whether Foursquare sync is available
  // On the client we detect this by trying the endpoint; gate visually
  const hasFoursquareKey =
    typeof process !== "undefined" ? false : false; // server-only; banner always shows

  const handleSync = async () => {
    if (!form.businessName || !form.city || !form.state) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/citations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          address: form.address,
          city: form.city,
          state: form.state,
          phone: form.phone,
        }),
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.success) setSynced(true);
    } catch {
      setSyncResult({ success: false, details: "Sync request failed" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6 text-electric-500" />
          Citation Checker
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Check your NAP (Name, Address, Phone) consistency across 18 major directories. Fix issues directly.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">
              Business Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="e.g. Acme Plumbing"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              City <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="e.g. Austin"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              State <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="e.g. TX"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. (512) 555-1234"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. 123 Main St"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-electric-500 hover:bg-electric-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Checking 18 directories…
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Check Citations
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">

          {/* Listing Sync Banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl border border-emerald-500/20 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  Sync Your Listing to 50+ Directories
                  {syncResult?.action === "error" && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-normal">
                      Premium Feature
                    </span>
                  )}
                </h3>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  One click pushes your business info to the Foursquare data network,
                  which feeds Bing, Samsung, Uber, HERE Maps, and 50+ other services.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Bing Maps", "Samsung", "Uber", "HERE Maps", "TomTom", "MapQuest", "+44 more"].map((d) => (
                    <span
                      key={d}
                      className="text-xs px-2 py-1 bg-[var(--background)] rounded-full border border-[var(--border)]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0">
                {syncResult?.details?.includes("Available on") ? (
                  <a
                    href="/billing"
                    className="px-6 py-3 bg-[var(--card)] border border-[var(--border)] hover:border-emerald-500/50 text-[var(--foreground)] rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
                  >
                    <Lock className="w-4 h-4" />
                    Available on Growth Plan
                  </a>
                ) : (
                  <button
                    onClick={handleSync}
                    disabled={syncing || synced}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : synced ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {syncing ? "Syncing..." : synced ? "Synced ✓" : "Sync Now"}
                  </button>
                )}
              </div>
            </div>

            {syncResult && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm ${
                  syncResult.success
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                {syncResult.success ? "✅" : "❌"} {syncResult.details}
              </div>
            )}
          </div>
          {/* Summary */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
            <h2 className="font-bold text-lg mb-4">
              Results for {result.businessName}
              <span className="text-[var(--muted-foreground)] font-normal text-sm ml-2">
                {result.location}
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-[var(--background)] rounded-lg">
                <div className="text-2xl font-bold">{result.summary.grade}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Grade</div>
              </div>
              <div className="text-center p-3 bg-[var(--background)] rounded-lg">
                <div className="text-2xl font-bold">{result.summary.overallConsistencyScore}%</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Consistency</div>
              </div>
              <div className="text-center p-3 bg-[var(--background)] rounded-lg">
                <div className="text-2xl font-bold text-emerald-400">{result.summary.foundIn}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Found</div>
              </div>
              <div className="text-center p-3 bg-[var(--background)] rounded-lg">
                <div className="text-2xl font-bold text-red-400">{needsFixCount}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Need Fix</div>
              </div>
            </div>

            {result.recommendations.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    {rec}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Issues first */}
          {needsFixCount > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-red-400 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Needs Attention ({needsFixCount})
              </h3>
              <div className="grid gap-3">
                {result.citations
                  .filter(
                    (c) =>
                      !c.found ||
                      c.nameMatch === false ||
                      c.phoneMatch === false ||
                      c.consistencyScore < 80
                  )
                  .map((citation, i) => (
                    <CitationCard key={i} citation={citation} />
                  ))}
              </div>
            </div>
          )}

          {/* Passing citations */}
          {result.citations.filter((c) => c.found && c.consistencyScore >= 80).length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-emerald-400 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Looking Good ({result.citations.filter((c) => c.found && c.consistencyScore >= 80).length})
              </h3>
              <div className="grid gap-3">
                {result.citations
                  .filter((c) => c.found && c.consistencyScore >= 80)
                  .map((citation, i) => (
                    <CitationCard key={i} citation={citation} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
