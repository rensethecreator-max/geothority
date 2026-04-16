"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  Plus,
  Trash2,
  Bell,
  Star,
  MessageSquare,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  X,
} from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formatDistanceToNow } from "date-fns";

interface GbpAlert {
  id: string;
  alert_type: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface GbpMonitor {
  id: string;
  business_name: string;
  city: string;
  state: string;
  place_id: string | null;
  last_scanned: string | null;
  scan_frequency: string;
  active: boolean;
  created_at: string;
  gbp_alerts: GbpAlert[];
}

export default function GbpMonitorPage() {
  const [monitors, setMonitors] = useState<GbpMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    businessName: "",
    city: "",
    state: "",
    placeId: "",
  });

  const unreadAlerts = monitors.flatMap((m) => m.gbp_alerts.filter((a) => !a.read));

  async function loadMonitors() {
    try {
      const res = await fetch("/api/gbp/monitor");
      if (res.ok) {
        const data = (await res.json()) as { monitors: GbpMonitor[] };
        setMonitors(data.monitors || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonitors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/gbp/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          city: form.city,
          state: form.state,
          placeId: form.placeId || undefined,
          scanFrequency: "weekly",
        }),
      });

      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error || "Failed to create monitor");
      }

      await loadMonitors();
      setShowForm(false);
      setForm({ businessName: "", city: "", state: "", placeId: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this monitor?")) return;
    await fetch(`/api/gbp/monitor?id=${id}`, { method: "DELETE" });
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  };

  const alertIcon = (type: string) => {
    if (type === "rating_drop") return <TrendingDown className="w-4 h-4 text-red-400" />;
    if (type === "new_reviews") return <MessageSquare className="w-4 h-4 text-emerald-500" />;
    return <Bell className="w-4 h-4 text-amber-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-electric-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            GBP Monitor
            <InfoTooltip
              content="We'll automatically check your Google Business Profile weekly and alert you to changes in ratings, reviews, or competitor activity."
              side="right"
            />
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Track rating changes, new reviews, and competitor shifts weekly.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Monitor
        </button>
      </div>

      {/* Alert Feed */}
      {unreadAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-sm">
              {unreadAlerts.length} New Alert{unreadAlerts.length > 1 ? "s" : ""}
            </h2>
          </div>
          <div className="space-y-3">
            {unreadAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]"
              >
                {alertIcon(alert.alert_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monitor Cards */}
      {monitors.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Eye className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No monitors yet</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Add a business to start tracking its GBP rating, reviews, and competitor changes.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Add Your First Monitor
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {monitors.map((monitor) => {
            const alertCount = monitor.gbp_alerts.filter((a) => !a.read).length;
            return (
              <div
                key={monitor.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-electric-500/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{monitor.business_name}</h3>
                      {alertCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                          {alertCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {monitor.city}, {monitor.state}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(monitor.id)}
                    className="p-1.5 text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[var(--background)] rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-[var(--muted-foreground)]">Status</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {monitor.active ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-medium text-emerald-500">Active</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-amber-500">Paused</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-[var(--background)] rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <RefreshCw className="w-3 h-3 text-electric-500" />
                      <span className="text-xs text-[var(--muted-foreground)]">Frequency</span>
                    </div>
                    <span className="text-xs font-medium capitalize">{monitor.scan_frequency}</span>
                  </div>
                </div>

                <div className="text-xs text-[var(--muted-foreground)]">
                  {monitor.last_scanned
                    ? `Last scanned ${formatDistanceToNow(new Date(monitor.last_scanned), { addSuffix: true })}`
                    : "Not yet scanned"}
                </div>

                {/* Recent alerts for this monitor */}
                {monitor.gbp_alerts.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {monitor.gbp_alerts.slice(0, 3).map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                          alert.read ? "opacity-50" : "bg-[var(--background)]"
                        }`}
                      >
                        {alertIcon(alert.alert_type)}
                        <span className="truncate">{alert.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Monitor Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Add GBP Monitor</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Business Name</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  placeholder="Smith Insurance Agency"
                  required
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Austin"
                    required
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    placeholder="TX"
                    required
                    maxLength={2}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Google Place ID <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.placeId}
                  onChange={(e) => setForm((f) => ({ ...f, placeId: e.target.value }))}
                  placeholder="ChIJLwP..."
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Improves accuracy. Find it at{" "}
                  <a
                    href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric-500 hover:underline"
                  >
                    Place ID Finder
                  </a>
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 bg-[var(--muted)] hover:bg-[var(--accent)] rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-electric-500 hover:bg-electric-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? "Creating..." : "Start Monitoring"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
