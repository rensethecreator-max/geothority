/**
 * AggregatorAdapter — Abstract base class
 * All provider adapters extend this. Enforces contract + shared utilities.
 */

import type {
  AggregatorAdapter as IAdapter,
  AggregatorAdapterConfig,
  AggregatorProvider,
  CanonicalBusinessData,
  ConnectionResult,
  DeleteResult,
  ListingState,
  PushResult,
} from "./types";

export abstract class BaseAggregatorAdapter implements IAdapter {
  abstract readonly provider: AggregatorProvider;
  readonly config: AggregatorAdapterConfig;

  constructor(config: AggregatorAdapterConfig) {
    this.config = config;
  }

  // ─── Contract (must implement) ────────────────────────────────────────
  abstract testConnection(): Promise<ConnectionResult>;
  abstract pushBusiness(data: CanonicalBusinessData): Promise<PushResult>;
  abstract pullListing(businessId: string): Promise<ListingState>;
  abstract deleteListing(businessId: string): Promise<DeleteResult>;
  abstract mapPayload(data: CanonicalBusinessData): Record<string, unknown>;
  abstract mapResponse(raw: Record<string, unknown>): Partial<CanonicalBusinessData>;
  abstract healthCheck(): Promise<"ok" | "degraded" | "down">;

  // ─── Shared helpers ───────────────────────────────────────────────────

  protected getCredential(key: string): string {
    const val = this.config.credentials[key];
    if (!val) throw new Error(`Missing credential: ${key} for ${this.provider}`);
    return val;
  }

  protected buildPushResult(
    partial: Partial<PushResult>,
    syncedFields: string[]
  ): PushResult {
    return {
      success: partial.success ?? true,
      providerLocationId: partial.providerLocationId ?? null,
      syncedFields,
      errors: partial.errors ?? [],
      warnings: partial.warnings ?? [],
    };
  }

  /** Standard hours → array format many APIs expect */
  protected hoursToArray(hours: CanonicalBusinessData["hours"]): Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }> {
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    return days.map((day) => {
      const h = hours[day];
      return h
        ? { day, open: h.open, close: h.close, isClosed: false }
        : { day, open: "", close: "", isClosed: true };
    });
  }
}
