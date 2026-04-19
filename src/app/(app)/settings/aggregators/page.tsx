"use client";

import { useState, useEffect, useCallback } from "react";
import type { AggregatorProvider, AggregatorUserConfig, SyncFrequency } from "@/lib/aggregator/types";

const PROVIDER_META: Record<AggregatorProvider, { name: string; icon: string; color: string; requiredFields: string[] }> = {
  semrush: { name: "Semrush", icon: "🔍", color: "#F59E0B", requiredFields: ["apiKey"] },
  vendasta: { name: "Vendasta", icon: "🏪", color: "#3B82F6", requiredFields: ["apiKey"] },
  yext: { name: "Yext", icon: "📍", color: "#EF4444", requiredFields: ["apiKey", "accountId"] },
};

const SYNC_OPTIONS: { value: SyncFrequency; label: string }[] = [
  { value: "manual", label: "Manual only" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function AggregatorSettingsPage() {
  const [config, setConfig] = useState<AggregatorUserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<AggregatorProvider | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Credential form state per provider
  const [creds, setCreds] = useState<Record<AggregatorProvider, Record<string, string>>>({
    semrush: { apiKey: "" },
    vendasta: { apiKey: "" },
    yext: { apiKey: "", accountId: "" },
  });

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/aggregator/config");
    const data = await res.json();
    setConfig(data);
    // Pre-fill any saved credentials placeholders
    if (data.providers) {
      for (const p of data.providers) {
        setCreds((prev) => ({
          ...prev,
          [p.provider as AggregatorProvider]: { ...prev[p.provider as AggregatorProvider], ...Object.fromEntries(Object.keys(p.credentials).map((k) => [k, "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"])) },
        }));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleTestConnection = async (provider: AggregatorProvider) => {
    setTesting(provider);
    const res = await fetch("/api/aggregator/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test_connection", provider }),
    });
    const result = await res.json();
    setTestResults((prev) => ({ ...prev, [provider]: result }));
    setTesting(null);
  };

  const handleSaveProvider = async (provider: AggregatorProvider) => {
    // Only send real (non-masked) credentials
    const realCreds = Object.fromEntries(
      Object.entries(creds[provider]).filter(([, v]) => v && !v.startsWith("•"))
    );
    if (Object.keys(realCreds).length === 0) return;

    const res = await fetch("/api/aggregator/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_provider", provider, credentials: realCreds }),
    });
    const result = await res.json();
    setConfig(result.config);
    setTestResults((prev) => ({ ...prev, [provider]: result.connectionTest }));
  };

  const handleRemoveProvider = async (provider: AggregatorProvider) => {
    await fetch("/api/aggregator/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_provider", provider }),
    });
    fetchConfig();
  };

  const handleUpdatePreferences = async (updates: Partial<Pick<AggregatorUserConfig, "globalSyncFrequency" | "autoSync" | "notifyOnSync" | "notifyOnError">>) => {
    const res = await fetch("/api/aggregator/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setConfig(await res.json());
  };

  if (loading) return <div className="p-8 text-gray-400">Loading aggregator settings…</div>;

  const enabledProviders = new Set(config?.providers?.map((p) => p.provider) ?? []);

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Aggregator Integrations</h1>
        <p className="text-gray-400 mt-1">
          Connect distribution partners to push your business data across the local search ecosystem.
        </p>
      </div>

      {/* Global Settings */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-white">Sync Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Default Sync Frequency</label>
            <select
              value={config?.globalSyncFrequency ?? "weekly"}
              onChange={(e) => handleUpdatePreferences({ globalSyncFrequency: e.target.value as SyncFrequency })}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
            >
              {SYNC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-6 pt-6">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={config?.autoSync ?? false}
                onChange={(e) => handleUpdatePreferences({ autoSync: e.target.checked })}
                className="rounded"
              />
              Auto-sync on changes
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={config?.notifyOnSync ?? true}
                onChange={(e) => handleUpdatePreferences({ notifyOnSync: e.target.checked })}
                className="rounded"
              />
              Notify on sync
            </label>
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="space-y-4">
        {(["semrush", "vendasta", "yext"] as AggregatorProvider[]).map((provider) => {
          const meta = PROVIDER_META[provider];
          const isEnabled = enabledProviders.has(provider);
          const testResult = testResults[provider];

          return (
            <div
              key={provider}
              className={`bg-gray-900 rounded-xl p-6 border ${
                isEnabled ? `border-[${meta.color}]/40` : "border-gray-800"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{meta.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isEnabled ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"
                    }`}>
                      {isEnabled ? "Connected" : "Not connected"}
                    </span>
                  </div>
                </div>
                {isEnabled && (
                  <button
                    onClick={() => handleRemoveProvider(provider)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {meta.requiredFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm text-gray-400 mb-1 capitalize">
                      {field.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                    <input
                      type="password"
                      value={creds[provider][field] ?? ""}
                      onChange={(e) =>
                        setCreds((prev) => ({
                          ...prev,
                          [provider]: { ...prev[provider], [field]: e.target.value },
                        }))
                      }
                      placeholder={isEnabled ? "Saved ••••••••" : `Enter ${field}`}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => handleSaveProvider(provider)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
                >
                  {isEnabled ? "Update" : "Connect"}
                </button>
                <button
                  onClick={() => handleTestConnection(provider)}
                  disabled={testing === provider}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  {testing === provider ? "Testing…" : "Test Connection"}
                </button>
                {testResult && (
                  <span className={`text-sm ${testResult.success ? "text-green-400" : "text-red-400"}`}>
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
