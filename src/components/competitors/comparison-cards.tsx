"use client";

interface BusinessMetrics {
  name: string;
  domain: string;
  score: number;
  rating: number | null;
  reviewCount: number | null;
  citationCount: number | null;
  isYou?: boolean;
}

interface ComparisonCardsProps {
  you: BusinessMetrics;
  competitors: BusinessMetrics[];
}

function MetricRow({
  label,
  youValue,
  theirValue,
  format = (v: number) => String(v),
  higherIsBetter = true,
}: {
  label: string;
  youValue: number | null;
  theirValue: number | null;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
}) {
  const youNum = youValue ?? 0;
  const theirNum = theirValue ?? 0;
  const youWins = higherIsBetter ? youNum >= theirNum : youNum <= theirNum;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-xs text-[var(--muted-foreground)] w-24 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-3 flex-1 justify-end">
        {/* You */}
        <span
          className={`text-xs font-semibold tabular-nums ${
            youWins ? "text-emerald-400" : "text-[var(--muted-foreground)]"
          }`}
        >
          {youValue !== null ? format(youNum) : "-"}
          {youWins && youNum !== theirNum && (
            <span className="ml-0.5 text-emerald-400/60">↑</span>
          )}
        </span>

        {/* Bar comparison */}
        <div className="flex flex-col gap-0.5 w-24">
          {/* Your bar */}
          <div className="h-1 bg-[var(--background)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min((youNum / Math.max(youNum, theirNum, 1)) * 100, 100)}%` }}
            />
          </div>
          {/* Their bar */}
          <div className="h-1 bg-[var(--background)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--muted-foreground)]/40 transition-all duration-500"
              style={{ width: `${Math.min((theirNum / Math.max(youNum, theirNum, 1)) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Them */}
        <span
          className={`text-xs font-semibold tabular-nums ${
            !youWins && youNum !== theirNum ? "text-red-400" : "text-[var(--muted-foreground)]"
          }`}
        >
          {theirValue !== null ? format(theirNum) : "-"}
        </span>
      </div>
    </div>
  );
}

export function ComparisonCards({ you, competitors }: ComparisonCardsProps) {
  if (competitors.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-1 rounded-full bg-emerald-500 inline-block" />
          You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-1 rounded-full bg-[var(--muted-foreground)]/40 inline-block" />
          Competitor
        </span>
        <span className="text-emerald-400/70 ml-auto">↑ = winning metric</span>
      </div>

      {/* One card per competitor */}
      <div className="grid md:grid-cols-3 gap-4">
        {competitors.slice(0, 3).map((comp, i) => {
          const youScore = you.score;
          const theirScore = comp.score;
          const delta = youScore - theirScore;

          return (
            <div
              key={i}
              className="geo-premium-card rounded-3xl p-5"
            >
              {/* Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold leading-tight">{comp.name}</div>
                    <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{comp.domain}</div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      delta >= 0
                        ? "text-emerald-400 bg-emerald-500/8 border border-emerald-500/15"
                        : "text-red-400 bg-red-500/8 border border-red-500/15"
                    }`}
                  >
                    {delta >= 0 ? `+${delta}` : delta} pts
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <MetricRow
                label="SEO Score"
                youValue={youScore}
                theirValue={theirScore}
              />
              {(you.rating !== null || comp.rating !== null) && (
                <MetricRow
                  label="Rating"
                  youValue={you.rating}
                  theirValue={comp.rating}
                  format={(v) => v.toFixed(1)}
                />
              )}
              {(you.reviewCount !== null || comp.reviewCount !== null) && (
                <MetricRow
                  label="Reviews"
                  youValue={you.reviewCount}
                  theirValue={comp.reviewCount}
                  format={(v) => v.toLocaleString()}
                />
              )}
              {(you.citationCount !== null || comp.citationCount !== null) && (
                <MetricRow
                  label="Citations"
                  youValue={you.citationCount}
                  theirValue={comp.citationCount}
                  format={(v) => `${v}/17`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
