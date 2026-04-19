/**
 * Adapter Registry — Central factory for creating provider adapters
 */

import type { AggregatorAdapterConfig, AggregatorProvider } from "./types";
import { BaseAggregatorAdapter } from "./base-adapter";
import { SemrushAdapter } from "./adapters/semrush-adapter";
import { VendastaAdapter } from "./adapters/vendasta-adapter";
import { YextAdapter } from "./adapters/yext-adapter";

const ADAPTER_MAP: Record<AggregatorProvider, new (config: AggregatorAdapterConfig) => BaseAggregatorAdapter> = {
  semrush: SemrushAdapter,
  vendasta: VendastaAdapter,
  yext: YextAdapter,
};

export function createAdapter(config: AggregatorAdapterConfig): BaseAggregatorAdapter {
  const Ctor = ADAPTER_MAP[config.provider];
  if (!Ctor) throw new Error(`Unknown aggregator provider: ${config.provider}`);
  return new Ctor(config);
}

export function getAvailableProviders(): AggregatorProvider[] {
  return Object.keys(ADAPTER_MAP) as AggregatorProvider[];
}

export function getProviderMeta(provider: AggregatorProvider) {
  const meta: Record<AggregatorProvider, { name: string; requiredCredentials: string[]; website: string }> = {
    semrush: {
      name: "Semrush Listing Management",
      requiredCredentials: ["apiKey"],
      website: "https://semrush.com",
    },
    vendasta: {
      name: "Vendasta Business Listings",
      requiredCredentials: ["apiKey"],
      website: "https://vendasta.com",
    },
    yext: {
      name: "Yext PowerListings",
      requiredCredentials: ["apiKey", "accountId"],
      website: "https://yext.com",
    },
  };
  return meta[provider];
}
