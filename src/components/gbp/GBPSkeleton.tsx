"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function GBPSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-7 w-48 mb-2 bg-[var(--muted)]" />
          <Skeleton className="h-4 w-32 bg-[var(--muted)]" />
        </div>
        <Skeleton className="h-10 w-28 bg-[var(--muted)] rounded-lg" />
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)] flex flex-col items-center gap-2"
          >
            <Skeleton className="h-[72px] w-[72px] rounded-full bg-[var(--muted)]" />
            <Skeleton className="h-3 w-16 bg-[var(--muted)]" />
          </div>
        ))}
      </div>

      {/* Profile + Checklist */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <Skeleton className="h-5 w-32 mb-4 bg-[var(--muted)]" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 mb-3">
              <Skeleton className="h-4 w-4 bg-[var(--muted)]" />
              <div className="flex-1">
                <Skeleton className="h-3 w-16 mb-1 bg-[var(--muted)]" />
                <Skeleton className="h-4 w-full bg-[var(--muted)]" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <Skeleton className="h-5 w-40 mb-4 bg-[var(--muted)]" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex gap-2 items-center">
                <Skeleton className="h-4 w-4 rounded-full bg-[var(--muted)]" />
                <Skeleton className="h-4 w-24 bg-[var(--muted)]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review + Engagement */}
      <div className="grid lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
            <Skeleton className="h-5 w-36 mb-4 bg-[var(--muted)]" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="bg-[var(--muted)]/30 rounded-lg p-3 text-center">
                  <Skeleton className="h-6 w-10 mx-auto mb-1 bg-[var(--muted)]" />
                  <Skeleton className="h-3 w-16 mx-auto bg-[var(--muted)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
