"use client";

import { useState } from "react";
import {
  MapPin,
  Link2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  Zap,
  Clock,
  TrendingUp,
  FileText,
  Send,
  Copy,
} from "lucide-react";

// Types mirroring the backend
interface FieldMatchResult {
  status: "match" | "mismatch" | "partial" | "missing" | "not_checked";
  expected: string | string[];
  found: string | string[] | null;
  notes: string;
}

interface CitationIssue {
  severity: "critical" | "high" | "medium" | "low";
  field: string;
  issue: string;
  impact: string;
  fixAction: string;
  fixUrl: string | null;
  autoFixable: boolean;
}

interface LinkOpportunity {
  id: string;
  type: string;
  websiteName: string;
  url: string;
  estimatedDa: number;
  relevance: number;
  locality: number;
  difficulty: "easy" | "medium" | "hard";
  suggestedAngle: string;
  outreachTemplate: { subject: string; body: string; followUpSubject: string; followUpBody: string };
  priority: number;
  tags: string[];
  notes: string;
}

interface DeepReport {
  citationHealth: {
    businessName: string;
    location: string;
    generatedAt: string;
    overall: {
      grade: string;
      score: number;
      totalDirectories: number;
      foundIn: number;
      consistencyScore: number;
      categoryMatchRate: number;
      serviceMatchRate: number;
      hoursAccuracyRate: number;
    };
    tierBreakdown: Record<string, { total: number; found: number; avgConsistency: number; issues: number }>;
    criticalIssues: CitationIssue[];
    prioritizedFixes: { priority: number; directory: string; tier: string; issue: CitationIssue; estimatedImpact: string; estimatedTimeMin: number }[];
    missingOpportunities: { directory: string; tier: string; category: string; estimatedDa: number; reason: string; claimUrl: string }[];
  };
  linkAuthority: {
    totalOpportunities: number;
    byDifficulty: { easy: number; medium: number; hard: number };
    avgDa: number;
    avgRelevance: number;
    avgLocality: number;
    topOpportunities: LinkOpportunity[];
  };
  combinedScore: number;
  actionPlan: {
    immediate: { title: string; description: string; type: string; estimatedImpact: number; estimatedTimeMin: number; actionUrl: string | null }[];
    thisWeek: { title: string; description: string; type: string; estimatedImpact: number; estimatedTimeMin: number; actionUrl: string | null }[];
    thisMonth: { title: string; description: string; type: string; estimatedImpact: number; estimatedTimeMin: number; actionUrl: string | null }[];
    automated: { title: string; description: string; type: string; estimatedImpact: number; estimatedTimeMin: number; actionUrl: string | null }[];
  };
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-[var(--border)]" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[severity] || colors.low}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: "bg-emerald-500/20 text-emerald-400",
    medium: "bg-amber-500/20 text-amber-400",
    hard: "bg-red-500/20 text-red-400",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${colors[difficulty] || ""}`}>{difficulty}</span>;
}

function OutreachCard({ opportunity }: { opportunity: LinkOpportunity }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm flex items-center gap-2">
            {opportunity.websiteName}
            <DifficultyBadge difficulty={opportunity.difficulty} />
            {opportunity.tags.includes("quick-win") && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-electric-500/20 text-electric-400">Quick Win</span>
            )}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">{opportunity.suggestedAngle}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[var(--muted-foreground)]">DA {opportunity.estimatedDa}</span>
          <span className="text-xs text-[var(--muted-foreground)]">R:{opportunity.relevance}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <a href={opportunity.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-electric-400 hover:underline">
          <ExternalLink className="w-3 h-3" /> Find Site
        </a>
        <button onClick={() => setExpanded(!expanded)} className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <Send className="w-3 h-3" /> {expanded ? "Hide" : "Show"} Outreach Template
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-[var(--border)] pt-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Subject:</span>
              <button onClick={() => handleCopy(opportunity.outreachTemplate.subject)} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="text-xs bg-[var(--background)] rounded-lg p-2">{opportunity.outreachTemplate.subject}</div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Body:</span>
              <button onClick={() => handleCopy(opportunity.outreachTemplate.body)} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                {copied ? "✓ Copied" : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="text-xs bg-[var(--background)] rounded-lg p-2 whitespace-pre-wrap">{opportunity.outreachTemplate.body}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionSection({ title, icon: Icon, items, accent }: { title: string; icon: any; items: any[]; accent: string }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 text-${accent}-400`} />
        {title} ({items.length})
      </h3>
      <div className="grid gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-[var(--card)] rounded-lg border border-[var(--border)] p-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded bg-${accent}-500/20 text-${accent}-400`}>
                {item.type.replace("_", " ")}
              </span>
              <span className="text-sm truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 text-xs text-[var(--muted-foreground)]">
              <span>~{item.estimatedTimeMin}min</span>
              {item.actionUrl && (
                <a href={item.actionUrl} target="_blank" rel="noopener noreferrer" className="text-electric-400 hover:underline">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DeepCitationsPage() {
  const [form, setForm] = useState({
    businessName: "",
    address: "",
    phone: "",
    city: "",
    state: "",
    zip: "",
    website: "",
    industry: "",
    categories: "",
    services: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeepReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/deep-citations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categories: form.categories ? form.categories.split(",").map(s => s.trim()) : [],
          services: form.services ? form.services.split(",").map(s => s.trim()) : [],
        }),
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6 text-electric-500" />
          Deep Citation & Link Authority
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Full NAP audit across 80+ directories with category, service & hour checks. Plus AI-driven local backlink prospecting with personalized outreach.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Business Name <span className="text-red-400">*</span></label>
            <input type="text" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="e.g. Acme Plumbing" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Industry <span className="text-red-400">*</span></label>
            <input type="text" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="e.g. plumbing, dentistry, law" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">City <span className="text-red-400">*</span></label>
            <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Austin" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">State <span className="text-red-400">*</span></label>
            <input type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="e.g. TX" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(512) 555-1234" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Address</label>
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Website</label>
            <input type="text" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://acmeplumbing.com" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Categories <span className="text-[var(--muted-foreground)] font-normal">(comma-separated)</span></label>
            <input type="text" value={form.categories} onChange={e => setForm({ ...form, categories: e.target.value })} placeholder="Plumber, Emergency Plumber, Drain Cleaning" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Services <span className="text-[var(--muted-foreground)] font-normal">(comma-separated)</span></label>
            <input type="text" value={form.services} onChange={e => setForm({ ...form, services: e.target.value })} placeholder="Water Heater Install, Sewer Repair" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500/50" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-electric-500 hover:bg-electric-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing 80+ directories & link opportunities…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Deep Analysis
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Combined Score */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-6">
              <ScoreRing score={result.combinedScore} size={90} />
              <div>
                <h2 className="text-xl font-bold">{result.citationHealth.businessName}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">{result.citationHealth.location}</p>
                <div className="flex gap-3 mt-2">
                  <span className="text-xs px-2 py-1 bg-electric-500/20 text-electric-400 rounded-lg">Citation: {result.citationHealth.overall.grade}</span>
                  <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg">Links: {result.linkAuthority.totalOpportunities} opportunities</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <div className="text-center p-3 bg-[var(--background)] rounded-lg">
                <div className="text-xl font-bold">{result.citationHealth.overall.foundIn}/{result.citationHealth.overall.totalDirectories}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Citations Found</div>
              </div>
              <div className="text-center p-3 bg-[var(--background)] rounded-lg">
                <div className="text-xl font-bold">{result.citationHealth.overall.consistencyScore}%</div>
                <div className="text-xs text-[var(--muted-foreground)]">NAP Consistency</div>
              </div>
              <div className="text-center p-3 bg-[var(--background)] rounded-lg">
                <div className="text-xl font-bold">{result.citationHealth.overall.categoryMatchRate}%</div>
                <div className="text-xs text-[var(--muted-foreground)]">Category Match</div>
              </div>
              <div className="text-center p-3 bg-[var(--background)] rounded-lg">
                <div className="text-xl font-bold">{result.linkAuthority.byDifficulty.easy}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Easy Link Wins</div>
              </div>
            </div>
          </div>

          {/* Action Plan */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-electric-400" /> Action Plan</h2>
            <ActionSection title="Immediate" icon={AlertTriangle} items={result.actionPlan.immediate} accent="red" />
            <ActionSection title="This Week" icon={Clock} items={result.actionPlan.thisWeek} accent="amber" />
            <ActionSection title="This Month" icon={TrendingUp} items={result.actionPlan.thisMonth} accent="blue" />
            <ActionSection title="Automated" icon={Zap} items={result.actionPlan.automated} accent="electric" />
          </div>

          {/* Critical Issues */}
          {result.citationHealth.criticalIssues.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-red-400 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Critical Issues ({result.citationHealth.criticalIssues.length})
              </h3>
              <div className="grid gap-2">
                {result.citationHealth.criticalIssues.map((issue, i) => (
                  <div key={i} className="bg-[var(--card)] rounded-xl border border-red-500/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <SeverityBadge severity={issue.severity} />
                      <span className="text-sm font-medium">{issue.field}</span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">{issue.issue}</p>
                    <p className="text-xs text-amber-400 mt-1">Impact: {issue.impact}</p>
                    <p className="text-xs text-emerald-400 mt-1">Fix: {issue.fixAction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Citations */}
          {result.citationHealth.missingOpportunities.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Missing Citations ({result.citationHealth.missingOpportunities.length})
              </h3>
              <div className="grid gap-2">
                {result.citationHealth.missingOpportunities.slice(0, 15).map((missing, i) => (
                  <div key={i} className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{missing.directory}</span>
                      <span className="text-xs text-[var(--muted-foreground)] ml-2">({missing.tier} · DA ~{missing.estimatedDa})</span>
                    </div>
                    {missing.claimUrl && (
                      <a href={missing.claimUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors">
                        Claim <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link Opportunities */}
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
              <Link2 className="w-5 h-5 text-blue-400" />
              Local Link Opportunities ({result.linkAuthority.totalOpportunities})
            </h2>
            <div className="grid gap-3">
              {result.linkAuthority.topOpportunities.map((opp) => (
                <OutreachCard key={opp.id} opportunity={opp} />
              ))}
            </div>
          </div>

          {/* Export */}
          <div className="flex justify-end">
            <button
              onClick={async () => {
                const res = await fetch("/api/deep-citations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...form, categories: form.categories.split(",").map(s => s.trim()), services: form.services.split(",").map(s => s.trim()), format: "markdown" }),
                });
                const md = await res.text();
                const blob = new Blob([md], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `geothority-citation-link-report-${form.businessName.toLowerCase().replace(/\s+/g, "-")}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] hover:border-electric-500/50 rounded-lg text-sm transition-colors"
            >
              <FileText className="w-4 h-4" /> Export Markdown Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
