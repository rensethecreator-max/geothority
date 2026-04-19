/**
 * Aggregator Integration Layer — Canonical Types
 * Phase 8: Enables bulk distribution via Semrush, Vendasta, Yext
 */

// ─── Canonical Business Data ────────────────────────────────────────────
export interface CanonicalBusinessData {
  businessName: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2
  phone: string;
  website: string;
  email: string | null;
  description: string;
  categories: string[]; // Primary + additional
  hours: OperatingHours;
  geo: { lat: number; lng: number } | null;
  logoUrl: string | null;
  photoUrls: string[];
  socialProfiles: Record<string, string>; // platform → URL
  attributes: Record<string, string | boolean>; // e.g. wheelchairAccessible
  services: string[];
  paymentMethods: string[];
  yearEstablished: number | null;
  languages: string[];
  additionalFields: Record<string, unknown>; // Extensibility
}

export interface OperatingHours {
  /** ISO day name → open/close in HH:mm (24h). null = closed */
  [day: string]: { open: string; close: string } | null;
}

// ─── Adapter Interface ───────────────────────────────────────────────────
export type AggregatorProvider = "semrush" | "vendasta" | "yext";

export interface AggregatorAdapterConfig {
  provider: AggregatorProvider;
  credentials: Record<string, string>;
  syncFrequency: SyncFrequency;
  enabled: boolean;
  options: Record<string, unknown>;
}

export type SyncFrequency = "manual" | "daily" | "weekly" | "biweekly" | "monthly";

export interface AggregatorAdapter {
  readonly provider: AggregatorProvider;
  readonly config: AggregatorAdapterConfig;

  /** Validate that stored credentials actually work */
  testConnection(): Promise<ConnectionResult>;

  /** Push canonical data to the aggregator. Returns per-field status. */
  pushBusiness(data: CanonicalBusinessData): Promise<PushResult>;

  /** Pull current listing state from aggregator for diffing. */
  pullListing(businessId: string): Promise<ListingState>;

  /** Delete / suppress a listing. */
  deleteListing(businessId: string): Promise<DeleteResult>;

  /** Map canonical data → provider-specific payload */
  mapPayload(data: CanonicalBusinessData): Record<string, unknown>;

  /** Map provider-specific response → canonical shape */
  mapResponse(raw: Record<string, unknown>): Partial<ListingState>;

  /** Health check — lightweight ping. */
  healthCheck(): Promise<"ok" | "degraded" | "down">;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
  providerId?: string; // Account / location ID on provider side
}

export interface PushResult {
  success: boolean;
  providerLocationId: string | null;
  syncedFields: string[];
  errors: FieldError[];
  warnings: string[];
}

export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export interface DeleteResult {
  success: boolean;
  message: string;
}

export interface ListingState {
  providerLocationId: string;
  lastSyncedAt: string; // ISO
  status: "active" | "pending" | "suppressed" | "error";
  data: Partial<CanonicalBusinessData>;
  providerRaw: Record<string, unknown>;
}

// ─── Sync Job ────────────────────────────────────────────────────────────
export type SyncJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface SyncJob {
  id: string;
  userId: string;
  provider: AggregatorProvider;
  status: SyncJobStatus;
  businessData: CanonicalBusinessData;
  result: PushResult | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  maxRetries: number;
  error: string | null;
}

export interface SyncJobLog {
  id: string;
  jobId: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// ─── User Configuration ──────────────────────────────────────────────────
export interface AggregatorUserConfig {
  userId: string;
  providers: AggregatorAdapterConfig[];
  globalSyncFrequency: SyncFrequency;
  autoSync: boolean; // Auto-push on canonical data change
  notifyOnSync: boolean;
  notifyOnError: boolean;
  createdAt: string;
  updatedAt: string;
}
