'use client';

import { useState } from 'react';

interface DetectedFeatureInput {
  type: string;
  present: boolean;
  currentHolder?: string;
  snippetFormat?: string;
}

export default function SerpFeaturesPage() {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/serp-features/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, location }),
      });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">SERP Feature Optimizer</h1>
        <p className="text-gray-400 mt-1">Analyze SERPs for Local Pack & Featured Snippet opportunities</p>
      </div>

      {/* Input */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Target Keyword</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white"
              placeholder="e.g. auto insurance near me"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Location</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white"
              placeholder="e.g. Austin, TX"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={!keyword || !location || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium"
        >
          {loading ? 'Analyzing...' : 'Analyze SERP Features'}
        </button>
      </div>

      {/* Report */}
      {report && (
        <div className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ScoreCard label="Overall SERP Readiness" score={report.overallScore} />
            <ScoreCard label="Local Pack Readiness" score={report.localPackReadiness} />
            <ScoreCard label="Snippet Readiness" score={report.snippetReadiness} />
          </div>

          {/* Quick Wins */}
          {report.quickWins?.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-green-400 mb-4">⚡ Quick Wins</h2>
              <div className="space-y-3">
                {report.quickWins.map((qw: any, i: number) => (
                  <OpportunityCard key={i} opp={qw} variant="green" />
                ))}
              </div>
            </div>
          )}

          {/* Long Term */}
          {report.longTermPlays?.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-blue-400 mb-4">🎯 Long-Term Plays</h2>
              <div className="space-y-3">
                {report.longTermPlays.map((lt: any, i: number) => (
                  <OpportunityCard key={i} opp={lt} variant="blue" />
                ))}
              </div>
            </div>
          )}

          {/* Content Pieces */}
          {report.contentPieces?.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-purple-400 mb-4">📝 Recommended Content</h2>
              <div className="space-y-4">
                {report.contentPieces.map((cp: any) => (
                  <ContentPieceCard key={cp.id} piece={cp} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 text-center">
      <div className={`text-3xl font-bold ${color}`}>{score}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function OpportunityCard({ opp, variant }: { opp: any; variant: string }) {
  const borderColor = variant === 'green' ? 'border-green-900' : 'border-blue-900';
  return (
    <div className={`bg-gray-800 rounded-lg p-4 border ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-white">{opp.keyword}</span>
        <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
          {opp.featureType.replace('_', ' ')}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-2">{opp.strategy?.title}</p>
      <div className="flex gap-4 text-xs text-gray-500">
        <span>Impact: {opp.estimatedImpact}</span>
        <span>Difficulty: {opp.difficulty}</span>
        <span>Priority: {opp.priority}</span>
      </div>
      {opp.strategy?.actions?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {opp.strategy.actions.slice(0, 3).map((a: string, i: number) => (
            <li key={i} className="text-xs text-gray-500 flex gap-2">
              <span className="text-gray-600">•</span> {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ContentPieceCard({ piece }: { piece: any }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-white">{piece.title}</span>
        <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded">
          {piece.format.replace('_', ' ')}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-3">Target: {piece.targetKeyword} → {piece.targetFeature.replace('_', ' ')}</p>
      <div className="bg-gray-900 rounded p-3 mb-3">
        <p className="text-xs text-gray-300 font-medium mb-1">Snippet-Optimized Section:</p>
        <p className="text-xs text-gray-500">{piece.snippetOptimizedSection}</p>
      </div>
      <div className="mb-2">
        <p className="text-xs text-gray-400 font-medium mb-1">Outline:</p>
        {piece.outline.map((h: string, i: number) => (
          <p key={i} className="text-xs text-gray-500 pl-2">{h}</p>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-gray-500 mt-2">
        <span>Schema: {piece.schemaMarkup}</span>
        <span>Traffic Lift: +{piece.estimatedTrafficLift}%</span>
      </div>
      {piece.gbpActions?.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-400 font-medium mb-1">GBP Actions:</p>
          {piece.gbpActions.slice(0, 3).map((a: string, i: number) => (
            <p key={i} className="text-xs text-gray-500 pl-2">• {a}</p>
          ))}
        </div>
      )}
    </div>
  );
}
