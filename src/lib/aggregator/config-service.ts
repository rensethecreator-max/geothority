/**
 * Aggregator Configuration Service
 * Manages user-level partner credentials, sync frequency, and preferences.
 * API routes consume this; UI settings page uses it directly.
 */

import type {
  AggregatorAdapterConfig,
  AggregatorProvider,
  AggregatorUserConfig,
  SyncFrequency,
} from "./types";
import { getProviderMeta } from "./adapter-registry";
import { createAdapter } from "./adapter-registry";

// ─── In-memory store (swap for Supabase in production) ──────────────────
const configStore = new Map<string, AggregatorUserConfig>();

const DEFAULT_CONFIG: Omit<AggregatorUserConfig, "userId" | "createdAt" | "updatedAt"> = {
  providers: [],
  globalSyncFrequency: "weekly",
  autoSync: false,
  notifyOnSync: true,
  notifyOnError: true,
};

// ─── Public API ──────────────────────────────────────────────────────────

/** Get or create user config */
export function getUserConfig(userId: string): AggregatorUserConfig {
  let config = configStore.get(userId);
  if (!config) {
    config = {
      userId,
      ...DEFAULT_CONFIG,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    configStore.set(userId, config);
  }
  return config;
}

/** Update global sync preferences */
export function updateSyncPreferences(
  userId: string,
  opts: {
    globalSyncFrequency?: SyncFrequency;
    autoSync?: boolean;
    notifyOnSync?: boolean;
    notifyOnError?: boolean;
  }
): AggregatorUserConfig {
  const config = getUserConfig(userId);
  if (opts.globalSyncFrequency !== undefined) config.globalSyncFrequency = opts.globalSyncFrequency;
  if (opts.autoSync !== undefined) config.autoSync = opts.autoSync;
  if (opts.notifyOnSync !== undefined) config.notifyOnSync = opts.notifyOnSync;
  if (opts.notifyOnError !== undefined) config.notifyOnError = opts.notifyOnError;
  config.updatedAt = new Date().toISOString();
  return config;
}

/** Add or update a provider configuration */
export async function setProviderConfig(
  userId: string,
  provider: AggregatorProvider,
  credentials: Record<string, string>,
  syncFrequency?: SyncFrequency,
  enabled?: boolean
): Promise<{ config: AggregatorUserConfig; connectionTest: { success: boolean; message: string } }> {
  const config = getUserConfig(userId);
  const meta = getProviderMeta(provider);

  // Validate required credentials
  const missing = meta.requiredCredentials.filter((k) => !credentials[k]);
  if (missing.length > 0) {
    return {
      config,
      connectionTest: { success: false, message: `Missing credentials: ${missing.join(", ")}` },
    };
  }

  const adapterConfig: AggregatorAdapterConfig = {
    provider,
    credentials,
    syncFrequency: syncFrequency ?? config.globalSyncFrequency,
    enabled: enabled ?? true,
    options: {},
  };

  // Test connection before saving
  let connectionTest = { success: false, message: "" };
  if (adapterConfig.enabled) {
    try {
      const adapter = createAdapter(adapterConfig);
      const result = await adapter.testConnection();
      connectionTest = { success: result.success, message: result.message };
    } catch (err: any) {
      connectionTest = { success: false, message: err.message };
    }
  } else {
    connectionTest = { success: true, message: "Saved (disabled)" };
  }

  // Upsert provider in list
  const idx = config.providers.findIndex((p) => p.provider === provider);
  if (idx >= 0) {
    config.providers[idx] = adapterConfig;
  } else {
    config.providers.push(adapterConfig);
  }

  config.updatedAt = new Date().toISOString();
  return { config, connectionTest };
}

/** Remove a provider config */
export function removeProvider(
  userId: string,
  provider: AggregatorProvider
): AggregatorUserConfig {
  const config = getUserConfig(userId);
  config.providers = config.providers.filter((p) => p.provider !== provider);
  config.updatedAt = new Date().toISOString();
  return config;
}

/** Test an existing saved provider connection */
export async function testProviderConnection(
  userId: string,
  provider: AggregatorProvider
): Promise<{ success: boolean; message: string }> {
  const config = getUserConfig(userId);
  const prov = config.providers.find((p) => p.provider === provider);
  if (!prov) return { success: false, message: `Provider ${provider} not configured` };

  try {
    const adapter = createAdapter(prov);
    const result = await adapter.testConnection();
    return { success: result.success, message: result.message };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/** Health check across all configured providers */
export async function healthCheckAll(
  userId: string
): Promise<Record<AggregatorProvider, "ok" | "degraded" | "down" | "not_configured">> {
  const config = getUserConfig(userId);
  const result: Record<string, "ok" | "degraded" | "down" | "not_configured"> = {};

  for (const prov of config.providers) {
    try {
      const adapter = createAdapter(prov);
      result[prov.provider] = await adapter.healthCheck();
    } catch {
      result[prov.provider] = "down";
    }
  }

  // Mark unconfigured providers
  const all: AggregatorProvider[] = ["semrush", "vendasta", "yext"];
  for (const p of all) {
    if (!result[p]) result[p] = "not_configured";
  }

  return result as any;
}
