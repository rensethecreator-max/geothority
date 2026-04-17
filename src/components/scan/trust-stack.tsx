"use client";

import { LAYER_NAMES, LAYER_DESCRIPTIONS } from "@/lib/types";
import { Building2, FileText, MapPin, Star, Cpu } from "lucide-react";
import { LayerInfoTooltip } from "@/components/ui/info-tooltip";
import { useEffect, useRef, useState } from "react";

const layerIcons = [Building2, FileText, MapPin, Star, Cpu];

function getScoreColor(score: number) {
  if (score >= 70) return "bg-score-good";
  if (score >= 40) return "bg-score-mid";
  return "bg-score-poor";
}

function getScoreTextColor(score: number) {
  if (score >= 70) return "text-score-good";
  if (score >= 40) return "text-score-mid";
  return "text-score-poor";
}

function getScoreLabel(score: number) {
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
        <span className="text-xs text-[var(--muted-foreground)]">5-Layer Framework</span>
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
            style={animated ? { animationDelay: `${index * 80}ms` } : undefined}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getScoreColor(score)}/10`}>
                <Icon className={`w-4 h-4 ${getScoreTextColor(score)}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    Layer {num}: {LAYER_NAMES[num]}
                    <LayerInfoTooltip layerNum={num} side="right" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getScoreColor(score)}/10 ${getScoreTextColor(score)}`}>
                      {getScoreLabel(score)}
                    </span>
                    <span className={`text-lg font-bold ${getScoreTextColor(score)}`}>{score}</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{LAYER_DESCRIPTIONS[num]}</p>
              </div>
            </div>
            <div className="h-1.5 bg-[var(--background)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${getScoreColor(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Score Ring ──────────────────────────────────────────────────────────────

interface ScoreRingProps {
  score: number;
  size?: number;
  label?: string;
}

export function ScoreRing({ score, size = 120, label = "Geothority Score" }: ScoreRingProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [glowing, setGlowing] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const didAnimate = useRef(false);

  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (displayScore / 100) * circumference;
  const color = score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";

  useEffect(() => {
    if (didAnimate.current) return;
    didAnimate.current = true;

    // Count-up: 0 → score over 1.4s with ease-out cubic
    const duration = 1400;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * score));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplayScore(score);
        // Gentle single glow pulse after count finishes
        setGlowing(true);
        setTimeout(() => setGlowing(false), 1200);
        // Subtle sparkle burst only for high scores
        if (score >= 80) {
          setShowSparkles(true);
          setTimeout(() => setShowSparkles(false), 1800);
        }
      }
    };
    requestAnimationFrame(tick);
  }, [score]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>

        {/* Single soft glow ring - barely visible, fades in/out once */}
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-700 pointer-events-none"
          style={{
            boxShadow: `0 0 18px 2px ${color}30`,
            opacity: glowing ? 1 : 0,
          }}
        />

        {/* Subtle sparkle dots - small, fade out in 1.8s */}
        {showSparkles && <SparkleRing size={size} color={color} />}

        <svg className="transform -rotate-90" width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--muted)" strokeWidth="6" fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: "stroke-dashoffset 40ms linear" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>{displayScore}</span>
          <span className="text-xs text-[var(--muted-foreground)]">/100</span>
        </div>
      </div>

      {label && (
        <span className="text-sm font-medium mt-2 text-[var(--muted-foreground)]">{label}</span>
      )}
    </div>
  );
}

// ─── Sparkle Ring ─────────────────────────────────────────────────────────────
// 8 small dots orbiting the ring, fading out. No canvas needed.

interface SparkleRingProps {
  size: number;
  color: string;
}

function SparkleRing({ size, color }: SparkleRingProps) {
  const count = 8;
  const r = size / 2 - 2;
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ animation: "sparkle-ring-fade 1.8s ease-out forwards" }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        const x = size / 2 + r * Math.cos(angle) - 3;
        const y = size / 2 + r * Math.sin(angle) - 3;
        return (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              left: x,
              top: y,
              backgroundColor: color,
              opacity: 0.7,
              animationDelay: `${i * 30}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
