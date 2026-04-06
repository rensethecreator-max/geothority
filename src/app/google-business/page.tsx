"use client";

import { useEffect, useState } from "react";
import { signInWithGoogleBusiness } from "@/lib/google-business/oauth";
import GBPDashboard from "@/components/gbp/GBPDashboard";
import { GBPSkeleton } from "@/components/gbp/GBPSkeleton";
import { Building2, RefreshCw, AlertCircle, CheckCircle2, Wifi } from "lucide-react";

interface GBPStatus {
  authenticated: boolean;
  googleConnected: boolean;
  hasSyncedProfile: boolean;
  lastSyncedAt: string | null;
  businessName: string | null;
}

export default function GoogleBusinessPage() {
  const [status, setStatus] = useState<GBPStatus | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  // Load profile data if connected & synced
  useEffect(() => {
    if (status?.hasSyncedProfile) {
      fetchProfile();
    }
  }, [status]);

  async function fetchStatus() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/gbp/status");
      if (!res.ok) throw new Error(`Status check failed (${res.status})`);
      const data = await res.json();
      setStatus(data);
    } catch (e: any) {
      setError("Could not check connection status: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfile() {
    try {
      const res = await fetch("/api/gbp/profile");
      if (!res.ok) return;
      const data = await res.json();
      setProfileData(data);
    } catch {
      // Non-fatal — dashboard just won't show data
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      await signInWithGoogleBusiness(); // Redirects to Google OAuth
    } catch (e: any) {
      setError("Could not connect to Google: " + e.message);
      setConnecting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/gbp/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || "Sync failed");
      }
      setSuccessMsg(`✅ Synced "${data.businessName || "your profile"}" successfully.`);
      // Refresh status and profile
      await fetchStatus();
      await fetchProfile();
    } catch (e: any) {
      setError("Sync failed: " + e.message);
    } finally {
      setSyncing(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6">
        <GBPSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Google Business Profile</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Connect and sync your GBP to unlock Layer 6 scoring
              </p>
            </div>
          </div>

          {/* Connection badge */}
          {status?.googleConnected ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-sm bg-[var(--card)] border border-[var(--border)] px-3 py-1.5 rounded-full">
              <Wifi className="w-4 h-4" />
              Not connected
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 mb-6">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Success banner */}
        {successMsg && (
          <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 mb-6">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{successMsg}</p>
          </div>
        )}

        {/* Not connected — connect CTA */}
        {!status?.googleConnected && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-5">
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold mb-3">Connect Your Google Business Profile</h2>
            <p className="text-[var(--muted-foreground)] text-sm max-w-md mx-auto mb-2">
              Link your GBP to get a full Layer 6 health score — reviews, completeness, 
              engagement, photos, Q&A, and weekly monitoring.
            </p>
            <p className="text-[var(--muted-foreground)] text-xs max-w-md mx-auto mb-8">
              You stay in control. We only read your data and show you what to improve. 
              Any updates you approve are synced with one click.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:hover:scale-100"
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Redirecting to Google…
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  Connect Google Business Profile
                </>
              )}
            </button>
          </div>
        )}

        {/* Connected but not yet synced */}
        {status?.googleConnected && !status?.hasSyncedProfile && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold mb-3">Google Account Connected!</h2>
            <p className="text-[var(--muted-foreground)] text-sm max-w-md mx-auto mb-8">
              Now sync your Google Business Profile to pull in your real data — reviews, 
              photos, posts, Q&A — and calculate your GBP Health Score.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:hover:scale-100"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing your profile…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync Google Business Profile
                </>
              )}
            </button>
          </div>
        )}

        {/* Connected & synced — show dashboard */}
        {status?.googleConnected && status?.hasSyncedProfile && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {status.businessName && <span className="font-medium text-[var(--foreground)]">{status.businessName}</span>}
                  {status.lastSyncedAt && (
                    <span className="ml-2">
                      · Last synced {new Date(status.lastSyncedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 text-sm border border-[var(--border)] hover:border-[var(--foreground)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] px-4 py-2 rounded-lg transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync Now"}
              </button>
            </div>
            <GBPDashboard data={profileData} />
          </>
        )}

      </div>
    </div>
  );
}
