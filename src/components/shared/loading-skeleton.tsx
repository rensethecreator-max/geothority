import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Score card skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
            <Skeleton className="h-4 w-24 mb-3 bg-[var(--muted)]" />
            <Skeleton className="h-8 w-16 mb-2 bg-[var(--muted)]" />
            <Skeleton className="h-3 w-full bg-[var(--muted)]" />
          </div>
        ))}
      </div>
      {/* Trust Stack skeleton */}
      <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
        <Skeleton className="h-6 w-48 mb-6 bg-[var(--muted)]" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 mb-4">
            <Skeleton className="h-4 w-32 bg-[var(--muted)]" />
            <Skeleton className="h-6 flex-1 bg-[var(--muted)]" />
            <Skeleton className="h-4 w-12 bg-[var(--muted)]" />
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
        <div key={i} className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex justify-between items-start mb-3">
            <div>
              <Skeleton className="h-5 w-48 mb-2 bg-[var(--muted)]" />
              <Skeleton className="h-3 w-32 bg-[var(--muted)]" />
            </div>
            <Skeleton className="h-6 w-20 bg-[var(--muted)]" />
          </div>
          <Skeleton className="h-3 w-full mb-2 bg-[var(--muted)]" />
          <Skeleton className="h-3 w-3/4 bg-[var(--muted)]" />
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
