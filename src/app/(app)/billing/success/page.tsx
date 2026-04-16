"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const _sessionId = searchParams.get("session_id");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.push("/dashboard");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Confetti-like background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full opacity-70 animate-bounce"
            style={{
              left: `${(i * 5.3) % 100}%`,
              top: `${(i * 7.1) % 100}%`,
              backgroundColor: ["#3b82f6", "#6366f1", "#10b981", "#f59e0b"][i % 4],
              animationDelay: `${(i * 0.1) % 2}s`,
              animationDuration: `${1 + (i % 2)}s`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">You&apos;re in! 🎉</h1>
          <p className="text-muted-foreground">
            Your Geothority subscription is now active. Let&apos;s get your local SEO domination underway.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h3 className="font-semibold">What happens next:</h3>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              Run your first full local SEO audit
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              Review your Trust Stack™ score and improvement roadmap
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              Start monitoring your competitors
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push("/scan")}
            className="w-full bg-electric-500 hover:bg-electric-400"
          >
            Run Your First Audit
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full">
            Go to Dashboard
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Redirecting to dashboard in {countdown}s...
        </p>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Processing your subscription...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
