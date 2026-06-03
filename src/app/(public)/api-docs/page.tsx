"use client";

import { useState } from "react";
import { Code, Key, ArrowRight, CheckCircle2, Copy, Check, Zap } from "lucide-react";
import Link from "next/link";

const ENDPOINTS = [
  {
    category: "Business Data",
    endpoints: [
      {
        method: "GET",
        path: "/api/public/business/{slug}",
        description: "Get public business profile data including Trust Stack score, citations, and trust signal status",
        auth: "Private beta API key",
        params: [
          { name: "slug", type: "string", desc: "Business profile slug" },
        ],
        response: `{
  "business": {
    "name": "Smith Insurance Agency",
    "slug": "smith-insurance-tampa",
    "city": "Tampa",
    "state": "FL",
    "trust_stack_score": 78,
    "trust_signal_tier": "Gold",
    "citation_count": 42,
    "ai_visibility_score": 88
  }
}`,
      },
      {
        method: "GET",
        path: "/api/citations",
        description: "Get citation status across all directories for the authenticated user",
        auth: "Bearer token",
        params: [],
        response: `{
  "citations": [
    {
      "directory": "Google Business Profile",
      "status": "consistent",
      "nap_match": true,
      "last_checked": "2026-04-20T00:00:00Z"
    }
  ],
  "total": 68,
  "consistent": 54,
  "inconsistent": 8,
  "unchecked": 6
}`,
      },
    ],
  },
  {
    category: "Trust & Scoring",
    endpoints: [
      {
        method: "GET",
        path: "/api/trust-score",
        description: "Get the 8-signal Trust Signal Score with tier classification",
        auth: "Bearer token",
        params: [],
        response: `{
  "overall_score": 82,
  "tier": "Gold",
  "signals": {
    "nap_consistency": 95,
    "schema_presence": 70,
    "citation_coverage": 88,
    "review_velocity": 65,
    "ai_visibility": 90,
    "content_freshness": 78,
    "gbp_health": 85,
    "backlink_quality": 72
  },
  "last_computed": "2026-04-20T00:00:00Z"
}`,
      },
      {
        method: "GET",
        path: "/api/ai-visibility",
        description: "Get AI visibility scorecard across ChatGPT, Perplexity, Claude, and Google AI",
        auth: "Bearer token",
        params: [],
        response: `{
  "overall_score": 75,
  "engines": {
    "chatgpt": { "mentioned": true, "score": 80 },
    "perplexity": { "mentioned": true, "score": 72 },
    "google_ai": { "mentioned": false, "score": 45 },
    "claude": { "mentioned": true, "score": 78 }
  }
}`,
      },
    ],
  },
  {
    category: "API Key Management",
    endpoints: [
      {
        method: "POST",
        path: "/api/settings/api-keys",
        description: "Generate a new API key for programmatic access",
        auth: "Bearer token (private beta approval required)",
        params: [
          { name: "name", type: "string", desc: "Friendly name for the key" },
          { name: "permissions", type: "string[]", desc: "Array of permission scopes: read, write" },
        ],
        response: `{
  "key": "geo_live_abc123...",
  "name": "My Integration",
  "permissions": ["read"],
  "created_at": "2026-04-20T00:00:00Z"
}`,
      },
      {
        method: "GET",
        path: "/api/settings/api-keys",
        description: "List all API keys for the authenticated user",
        auth: "Bearer token",
        params: [],
        response: `{
  "keys": [
    {
      "id": "uuid",
      "name": "My Integration",
      "permissions": ["read"],
      "last_used": "2026-04-19T00:00:00Z",
      "created_at": "2026-04-20T00:00:00Z"
    }
  ]
}`,
      },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function ApiDocsPage() {
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-bold">Geothority API</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">v1</span>
          </div>
          <Link
            href="/settings"
            className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Key className="w-3.5 h-3.5" /> Manage API Keys
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Intro */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold mb-3">API Reference</h2>
          <p className="text-white/60 text-lg max-w-2xl">
            Programmatic access to your local SEO data. API access is available by private beta approval,
            not as part of the standard company signup flow.
            Authenticate with your API key via the <code className="px-1.5 py-0.5 bg-white/5 rounded text-sm text-emerald-400">Authorization</code> header.
          </p>
        </div>

        {/* Quick start */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-10">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" /> Quick Start
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-white/50 mb-2">1. Get your API key from Settings → API Keys</div>
            </div>
            <div>
              <div className="text-sm text-white/50 mb-2">2. Authenticate requests</div>
              <div className="relative">
                <pre className="bg-black/40 rounded-xl p-4 text-sm text-emerald-300 overflow-x-auto">
{`curl -H "Authorization: Bearer geo_live_your_key_here" \\
  https://geothority.io/api/trust-score`}
                </pre>
                <button
                  onClick={() => copyCode('curl -H "Authorization: Bearer geo_live_your_key_here" https://geothority.io/api/trust-score', 'quickstart')}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {copiedId === 'quickstart' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        {ENDPOINTS.map((category) => (
          <div key={category.category} className="mb-10">
            <h3 className="text-xl font-semibold mb-4">{category.category}</h3>
            <div className="space-y-3">
              {category.endpoints.map((endpoint) => {
                const id = `${endpoint.method}-${endpoint.path}`;
                const isExpanded = expandedEndpoint === id;
                return (
                  <div
                    key={id}
                    className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedEndpoint(isExpanded ? null : id)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${METHOD_COLORS[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm text-white/80 font-mono">{endpoint.path}</code>
                      <span className="text-sm text-white/40 ml-2 flex-1">{endpoint.description}</span>
                      <ArrowRight className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/5 px-5 py-5 space-y-4">
                        {/* Auth */}
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Authentication</div>
                          <div className="text-sm text-white/70">{endpoint.auth}</div>
                        </div>

                        {/* Params */}
                        {endpoint.params.length > 0 && (
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Parameters</div>
                            <div className="rounded-lg border border-white/8 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-white/[0.02]">
                                    <th className="text-left px-3 py-2 text-white/50 font-medium">Name</th>
                                    <th className="text-left px-3 py-2 text-white/50 font-medium">Type</th>
                                    <th className="text-left px-3 py-2 text-white/50 font-medium">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpoint.params.map((p) => (
                                    <tr key={p.name} className="border-t border-white/5">
                                      <td className="px-3 py-2 text-emerald-400 font-mono text-xs">{p.name}</td>
                                      <td className="px-3 py-2 text-white/50">{p.type}</td>
                                      <td className="px-3 py-2 text-white/70">{p.desc}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Response */}
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Response Example</div>
                          <div className="relative">
                            <pre className="bg-black/40 rounded-xl p-4 text-sm text-white/70 overflow-x-auto font-mono">
                              {endpoint.response}
                            </pre>
                            <button
                              onClick={() => copyCode(endpoint.response, id)}
                              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              {copiedId === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Rate limits */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-10">
          <h3 className="font-semibold mb-3">Rate Limits</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <div className="text-2xl font-bold text-white">100</div>
              <div className="text-sm text-white/50">Requests / minute</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <div className="text-2xl font-bold text-white">1,000</div>
              <div className="text-sm text-white/50">Requests / hour</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <div className="text-2xl font-bold text-white">10,000</div>
              <div className="text-sm text-white/50">Requests / day</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to integrate?</h3>
          <p className="text-white/60 mb-4">API access is available by private beta approval. Contact us before building against it.</p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 font-semibold text-[#071019] hover:opacity-90 transition-opacity"
          >
            View Plans <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
