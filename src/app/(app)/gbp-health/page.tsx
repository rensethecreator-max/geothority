"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ContentSkeleton } from "@/components/shared/loading-skeleton";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Shield,
  Clock,
  Zap,
  Unplug,
  Link2,
} from "lucide-react";
import Link from "next/link";

interface ConnectionEvent {
  id: string;
  event_type: string;
  event_detail: string | null;
  error_message: string | null;
  created_at: string;
}

interface HealthResponse {
  connected: boolean;
  connectionStatus: string;
  healthScore: number;
  needsReconnect: boolean;
  issues: string[];
  connection: any;
  recentEvents: ConnectionEvent[];
  recommendations: string[];
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  connected: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Connected" },
  expired: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", label: "Token Expired" },
  refresh_failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Refresh Failed" },
  disconnected: { icon: Unplug, color: "text-gray-400", bg: "bg-gray-500/10", label: "Disconnected" },
  reconnecting: { icon: RefreshCw, color: "text-blue-400", bg: "bg-blue-500/10", label: "Reconnecting" },
};

const EVENT_STYLES: Record<string, { icon: any; color: string }> = {
  connect: { icon: Link2, color: "text-emerald-400" },
  disconnect: { icon: Unplug, color: "text-red-400" },
  refresh_success: { icon: CheckCircle2, color: "text-emerald-400" },
  refresh_failure: { icon: XCircle, color: "text-red-400" },
  token_expired: { icon: AlertTriangle, color: "text-amber-400" },
  reconnect_prompt: { icon: RefreshCw, color: "text-blue-400" },
};

export default function GBPHealthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthResponse | null>(null);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gbp/health", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { signInWithGoogleBusiness } = await import("@/lib/google-business/oauth");
      await signInWithGoogleBusiness();
    } catch {
      // OAuth redirect
    } finally {
      setConnecting(false);
    }
  };

  if (loading) return <ContentSkeleton />;

  const status = STATUS_CONFIG[data?.connectionStatus ?? "disconnected"] ?? STATUS_CONFIG.disconnected;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-electric-500" />
          GBP Connection Health
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Monitor your Google Business Profile connection status, token health, and refresh reliability
        </p>
      </div>

      {/* Status card */}
      <div className={`rounded-2xl border p-6 ${status.bg} border-current/20`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <StatusIcon className={`w-8 h-8 ${status.color}`} />
              <div>
                <div className={`text-xl font-bold ${status.color}`}>{status.label}</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Health Score: <span className="font-bold text-[var(--foreground)]">{data?.healthScore ?? 0}/100</span>
                </div>
              </div>
            </div>

            {/* Issues */}
            {data?.issues && data.issues.length > 0 && (
              <div className="mt-4 space-y-2">
                {data.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-amber-300">{issue}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {data?.recommendations && data.recommendations.length > 0 && (
              <div className="mt-4 space-y-2">
                {data.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-electric-500 flex-shrink-0 mt-1.5" />
                    {rec}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex-shrink-0">
            {!data?.connected ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-6 py-3 bg-electric-500 hover:bg-electric-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 text-sm"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Connect Google
              </button>
            ) : data?.needsReconnect ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 text-sm"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Reconnect
              </button>
            ) : (
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 font-medium">
                Healthy ✓
              </div>
            )}
          </div>
        </div>

        {/* Health bar */}
        <div className="mt-4">
          <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (data?.healthScore ?? 0) >= 70 ? "bg-emerald-500" :
                (data?.healthScore ?? 0) >= 40 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${data?.healthScore ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Connection details */}
      {data?.connection && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold mb-3">Connection Details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {data.connection.connected_at && (
              <div>
                <div className="text-[var(--muted-foreground)] text-xs">Connected Since</div>
                <div>{new Date(data.connection.connected_at).toLocaleDateString()}</div>
              </div>
            )}
            {data.connection.last_successful_refresh && (
              <div>
                <div className="text-[var(--muted-foreground)] text-xs">Last Refresh</div>
                <div>{new Date(data.connection.last_successful_refresh).toLocaleDateString()}</div>
              </div>
            )}
            {data.connection.account_name && (
              <div>
                <div className="text-[var(--muted-foreground)] text-xs">Account</div>
                <div>{data.connection.account_name}</div>
              </div>
            )}
            {data.connection.location_name && (
              <div>
                <div className="text-[var(--muted-foreground)] text-xs">Location</div>
                <div>{data.connection.location_name}</div>
              </div>
            )}
            {data.connection.consecutive_failures > 0 && (
              <div>
                <div className="text-[var(--muted-foreground)] text-xs">Consecutive Failures</div>
                <div className="text-red-400 font-bold">{data.connection.consecutive_failures}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event log */}
      {data?.recentEvents && data.recentEvents.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--muted-foreground)]" />
            Connection History
          </h2>
          <div className="space-y-2">
            {data.recentEvents.map((event) => {
              const style = EVENT_STYLES[event.event_type] ?? { icon: Activity, color: "text-gray-400" };
              const EventIcon = style.icon;
              return (
                <div key={event.id} className="flex items-center gap-3 text-sm py-1.5">
                  <EventIcon className={`w-4 h-4 ${style.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{event.event_type.replace(/_/g, " ")}</span>
                    {event.event_detail && (
                      <span className="text-[var(--muted-foreground)] ml-2">{event.event_detail}</span>
                    )}
                    {event.error_message && (
                      <span className="text-red-400 ml-2 text-xs">{event.error_message}</span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0">
                    {new Date(event.created_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* What this enables */}
      {!data?.connected && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold mb-3">What GBP Connection Enables</h2>
          <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-electric-500" /> Automatic profile health monitoring</div>
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-electric-500" /> GBP post publishing with approval flow</div>
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-electric-500" /> Review monitoring and response suggestions</div>
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-electric-500" /> Photo and attribute change detection</div>
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-electric-500" /> Competitor GBP profile comparison</div>
          </div>
        </div>
      )}
    </div>
  );
}
