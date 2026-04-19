"use client";

import type { PublicBusinessProfile } from "@/lib/data-layer/types";
import { LAYER_NAMES, LAYER_DESCRIPTIONS } from "@/lib/types";

export default function ProfilePageClient({ profile }: { profile: PublicBusinessProfile }) {
  const score = profile.geothorityScore ?? 0;
  const scoreColor = score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6" aria-label="Breadcrumb">
          <a href="/" className="hover:text-white">Geothority</a>
          {profile.city && (
            <> &rsaquo; <a href={`/locations/${profile.city?.toLowerCase()}`} className="hover:text-white">{profile.city}</a></>
          )}
          <span className="text-gray-600"> &rsaquo; {profile.businessName}</span>
        </nav>

        {/* Header */}
        <div className="border border-gray-800 rounded-2xl p-8 mb-8">
          <h1 className="text-3xl font-bold mb-2">{profile.businessName}</h1>
          {(profile.city || profile.state) && (
            <p className="text-gray-400 mb-4">
              {profile.city}{profile.city && profile.state ? ", " : ""}{profile.state}
            </p>
          )}
          <a href={profile.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
            {profile.url}
          </a>

          {/* Score */}
          <div className="mt-6 flex items-center gap-4">
            <div className={`text-5xl font-bold ${scoreColor}`}>{score}</div>
            <div>
              <div className="font-semibold">Geothority Score</div>
              <div className="text-sm text-gray-400">out of 100</div>
            </div>
            {profile.geoReadinessScore !== null && (
              <div className="ml-8">
                <div className="text-2xl font-semibold text-blue-400">{profile.geoReadinessScore}</div>
                <div className="text-sm text-gray-400">GEO Readiness</div>
              </div>
            )}
          </div>
        </div>

        {/* Layer Scores */}
        {profile.layerScores && (
          <div className="border border-gray-800 rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-bold mb-4">Layer Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(profile.layerScores).map(([key, val]) => {
                const layerNum = parseInt(key.replace("layer", ""));
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-8 text-gray-500">L{layerNum}</span>
                    <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                        style={{ width: `${(val as number) ?? 0}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-mono">{(val as number) ?? 0}</span>
                    <span className="text-xs text-gray-500 w-32">{LAYER_NAMES[layerNum] ?? key}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Wins */}
        {profile.quickWins && profile.quickWins.length > 0 && (
          <div className="border border-gray-800 rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-bold mb-4">Top Quick Wins</h2>
            <ul className="space-y-2">
              {profile.quickWins.slice(0, 10).map((w, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    w.impact === "high" ? "bg-red-500/20 text-red-400" :
                    w.impact === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-green-500/20 text-green-400"
                  }`}>{w.impact}</span>
                  <span>L{w.layer}</span>
                  <span className="text-gray-300">{w.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Competitor Gaps */}
        {profile.competitorGaps && profile.competitorGaps.length > 0 && (
          <div className="border border-gray-800 rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-bold mb-4">Competitor Insights</h2>
            <ul className="space-y-2">
              {profile.competitorGaps.map((g, i) => (
                <li key={i} className="text-sm text-gray-300">
                  <span className="font-semibold text-white">{g.businessName}</span>
                  <span className="text-gray-500"> ({g.domain})</span> — {g.advantage}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Get your own Geothority Score and dominate local search.</p>
          <a href="/signup" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition">
            Run Your Free Scan →
          </a>
        </div>
      </div>
    </div>
  );
}
