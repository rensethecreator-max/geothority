import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-md mb-6">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
