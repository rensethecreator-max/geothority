"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to analytics/monitoring in production
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-electric-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <span className="text-xl font-semibold text-[var(--foreground)]">Geothority</span>
          </Link>
        </div>

        {/* Error icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-3">
          Something went wrong
        </h1>
        <p className="text-[var(--muted-foreground)] mb-2">
          We hit an unexpected error. This has been logged and we&apos;ll look into it.
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--muted-foreground)] mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        {!error.digest && <div className="mb-6" />}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-electric-500 hover:bg-electric-400 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] rounded-lg font-medium transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
