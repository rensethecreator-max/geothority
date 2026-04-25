import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  eyebrow?: string;
  meta?: string[];
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  eyebrow = "Mission control waiting",
  meta = [],
}: EmptyStateProps) {
  return (
    <div className="geo-premium-card rounded-3xl px-6 py-14 text-center sm:px-10">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center">
        <div className="mb-4 inline-flex items-center rounded-full border border-electric-500/20 bg-electric-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-electric-500">
          {eyebrow}
        </div>
        <div className="mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl geo-premium-muted">
          <Icon className="h-8 w-8 text-[var(--foreground)]" />
        </div>
        <h3 className="mb-2 text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mb-6 max-w-md text-sm leading-7 text-[var(--muted-foreground)]">
          {description}
        </p>
        {meta.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            {meta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[var(--border)] bg-[var(--background)]/70 px-3 py-1 text-[11px] font-medium text-[var(--muted-foreground)]"
              >
                {item}
              </span>
            ))}
          </div>
        )}
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center rounded-xl bg-electric-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-electric-600"
          >
            {actionLabel}
          </Link>
        )}
        {actionLabel && onAction && !actionHref && (
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center rounded-xl bg-electric-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-electric-600"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
