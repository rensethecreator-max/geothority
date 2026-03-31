"use client";

import { LAYER_NAMES, LAYER_DESCRIPTIONS } from "@/lib/types";
import {
  Building2,
  FileText,
  MapPin,
  Star,
  Cpu,
} from "lucide-react";

const layerIcons = [Building2, FileText, MapPin, Star, Cpu];

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-score-good";
  if (score >= 40) return "bg-score-mid";
  return "bg-score-poor";
}

function getScoreTextColor(score: number): string {
  if (score >= 70) return "text-score-good";
  if (score >= 40) return "text-score-mid";
  return "text-score-poor";
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "Healthy";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

interface TrustStackProps {
  layerScores: {
    layer1: number;
    layer2: number;
    layer3: number;
    layer4: number;
    layer5: number;
  };
  animated?: boolean;
}

export function TrustStackVisualization({ layerScores, animated = true }: TrustStackProps) {
  const layers = [
    { key: "layer1" as const, num: 1 },
    { key: "layer2" as const, num: 2 },
    { key: "layer3" as const, num: 3 },
    { key: "layer4" as const, num: 4 },
    { key: "layer5" as const, num: 5 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Local Trust Stack™</h3>
        <span className="text-xs text-[var(--muted-foreground)]">
          5-Layer Framework
        </span>
      </div>

      {layers.map(({ key, num }, index) => {
        const score = layerScores[key];
        const Icon = layerIcons[index];
        return (
          <div
            key={key}
            className={`bg-[var(--muted)]/50 rounded-xl p-4 border border-[var(--border)] ${
              animated ? "animate-fade-in" : ""
            }`}
            style={animated ? { animationDelay: `${index * 100}ms` } : undefined}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${getScoreColor(
                  score
                )}/15`}
              >
                <Icon className={`w-4 h-4 ${getScoreTextColor(score)}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Layer {num}: {LAYER_NAMES[num]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${getScoreColor(
                        score
                      )}/15 ${getScoreTextColor(score)}`}
                    >
                      {getScoreLabel(score)}
                    </span>
                    <span className={`text-lg font-bold ${getScoreTextColor(score)}`}>
                      {score}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {LAYER_DESCRIPTIONS[num]}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${getScoreColor(score)}`}
                style={{
                  width: animated ? `${score}%` : `${score}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ScoreRingProps {
  score: number;
  size?: number;
  label?: string;
}

export function ScoreRing({ score, size = 120, label = "Geothority Score" }: ScoreRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--muted)"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">/100</span>
        </div>
      </div>
      {label && (
        <span className="text-sm font-medium mt-2 text-[var(--muted-foreground)]">
          {label}
        </span>
      )}
    </div>
  );
}
