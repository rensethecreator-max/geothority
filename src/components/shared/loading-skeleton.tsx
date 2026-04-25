import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="geo-premium-card rounded-3xl p-6 sm:p-7">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="geo-shimmer h-3 w-28 bg-[var(--muted)]" />
            <Skeleton className="geo-shimmer h-8 w-56 bg-[var(--muted)]" />
            <Skeleton className="geo-shimmer h-4 w-72 max-w-full bg-[var(--muted)]" />
          </div>
          <Skeleton className="geo-shimmer h-11 w-40 rounded-xl bg-[var(--muted)]" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="geo-premium-muted rounded-2xl p-5">
              <Skeleton className="geo-shimmer mb-3 h-4 w-24 bg-[var(--muted)]" />
              <Skeleton className="geo-shimmer mb-2 h-8 w-16 bg-[var(--muted)]" />
              <Skeleton className="geo-shimmer h-3 w-full bg-[var(--muted)]" />
            </div>
          ))}
        </div>
      </div>
      <div className="geo-premium-card rounded-3xl p-6 sm:p-7">
        <Skeleton className="geo-shimmer mb-6 h-6 w-48 bg-[var(--muted)]" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mb-4 flex items-center gap-4 last:mb-0">
            <Skeleton className="geo-shimmer h-4 w-28 bg-[var(--muted)]" />
            <Skeleton className="geo-shimmer h-6 flex-1 bg-[var(--muted)]" />
            <Skeleton className="geo-shimmer h-4 w-12 bg-[var(--muted)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {[1, 2, 3].map((i) => (
        <div key={i} className="geo-premium-card rounded-3xl p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="geo-shimmer h-5 w-48 bg-[var(--muted)]" />
              <Skeleton className="geo-shimmer h-3 w-32 bg-[var(--muted)]" />
            </div>
            <Skeleton className="geo-shimmer h-6 w-20 rounded-full bg-[var(--muted)]" />
          </div>
          <Skeleton className="geo-shimmer mb-2 h-3 w-full bg-[var(--muted)]" />
          <Skeleton className="geo-shimmer h-3 w-3/4 bg-[var(--muted)]" />
        </div>
      ))}
    </div>
  );
}

export function ScanSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[var(--card)] rounded-xl p-8 border border-[var(--border)] text-center">
        <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4 bg-[var(--muted)]" />
        <Skeleton className="h-6 w-48 mx-auto mb-2 bg-[var(--muted)]" />
        <Skeleton className="h-4 w-64 mx-auto bg-[var(--muted)]" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <Skeleton className="h-5 w-40 mb-3 bg-[var(--muted)]" />
          <Skeleton className="h-8 w-full bg-[var(--muted)]" />
        </div>
      ))}
    </div>
  );
}
