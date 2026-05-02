import Link from "next/link";
import { ArrowRight, MessageSquareMore, Star, TrendingUp } from "lucide-react";

export function ReviewHealthCard({ reviewHealthScore, reviewScore, reviewCount }: { reviewHealthScore: number; reviewScore?: number; reviewCount?: number }) {
  const displayScore = reviewScore ?? Number(((reviewHealthScore / 100) * 5).toFixed(1));
  const urgency = reviewCount !== undefined && reviewCount < 10 ? "Low review volume is likely suppressing trust." : displayScore < 4.5 ? "Your rating can improve conversion and local trust." : "Review momentum is present, but automation can keep it compounding.";

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <MessageSquareMore className="h-3.5 w-3.5" /> Reputation engine
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-emerald-50">
            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-amber-300" /> {displayScore} stars</span>
            <span className="inline-flex items-center gap-1"><TrendingUp className="h-4 w-4 text-emerald-300" /> {reviewCount ?? "—"} reviews</span>
            <span>{reviewHealthScore}/100 review health</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-100/90">{urgency} Launch Geothority’s native review automation, private feedback capture, and proof pipeline from one place.</p>
        </div>
        <Link href="/reputation" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-300">
          Open Reputation Engine <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
