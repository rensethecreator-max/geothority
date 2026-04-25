"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveRecoverySession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setRecoveryReady(Boolean(data.session));
      }
    };

    resolveRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setRecoveryReady(Boolean(session));
      }
    });

    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled) {
        setRecoveryReady((current) => current ?? false);
      }
    }, 1500);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(fallbackTimer);
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push(`/login?reset=success&redirect=${encodeURIComponent(safeRedirect)}`), 2000);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Password updated!</h1>
            <p className="text-[var(--muted-foreground)]">
              Your password has been changed. Redirecting you to sign in…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (recoveryReady === false) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
                <KeyRound className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Reset link expired</h1>
            <p className="text-[var(--muted-foreground)] mb-6">
              Password reset links only work once and can expire quickly. Request a fresh link to keep your account secure.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={safeRedirect !== "/dashboard" ? `/forgot-password?redirect=${encodeURIComponent(safeRedirect)}` : "/forgot-password"}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Request a new reset link
              </Link>
              <Link
                href={safeRedirect !== "/dashboard" ? `/login?redirect=${encodeURIComponent(safeRedirect)}` : "/login"}
                className="inline-flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500/20 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-1">Set a new password</h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Choose a strong password for your Geothority account.
            </p>
          </div>

          {recoveryReady === null && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] text-sm">
              Verifying your reset link…
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-4 pr-10 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-2">
                Confirm new password
              </label>
              <input
                id="confirm"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || recoveryReady !== true}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Update password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
