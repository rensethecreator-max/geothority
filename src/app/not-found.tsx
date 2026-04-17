import Link from "next/link";
import { ArrowLeft, Search, MapPin } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo href="/" size={48} />
        </div>

        {/* 404 graphic */}
        <div className="relative mb-8">
          <div className="text-[8rem] font-bold text-electric-500/10 leading-none select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-electric-500/20 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-electric-400" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-3">
          This page went off the map
        </h1>
        <p className="text-[var(--muted-foreground)] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-electric-500 hover:bg-electric-400 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] rounded-lg font-medium transition-colors text-sm"
          >
            <Search className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
