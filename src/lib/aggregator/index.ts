/**
 * Aggregator Integration Layer — Phase 8
 * Public API surface for the entire module.
 */

// Types
export type {
  CanonicalBusinessData,
  OperatingHours,
  AggregatorAdapter as IAggregatorAdapter,
  AggregatorAdapterConfig,
  AggregatorProvider,
  SyncFrequency,
  ConnectionResult,
  PushResult,
  FieldError,
  DeleteResult,
  ListingState,
  SyncJob,
  SyncJobLog,
  SyncJobStatus,
  AggregatorUserConfig,
} from "./types";

// Base class (for extending with new providers)
export { BaseAggregatorAdapter } from "./base-adapter";

// Adapters
export { SemrushAdapter } from "./adapters/semrush-adapter";
export { VendastaAdapter } from "./adapters/vendasta-adapter";
export { YextAdapter } from "./adapters/yext-adapter";

// Registry
export { createAdapter, getAvailableProviders, getProviderMeta } from "./adapter-registry";

// Sync pipeline
export {
  queueSyncJob,
  executeJob,
  retryJob,
  cancelJob,
  getJob,
  listJobs,
  getJobLogs,
  syncAllProviders,
} from "./sync-job";
export type { SyncJobOptions } from "./sync-job";

// Config service
export {
  getUserConfig,
  updateSyncPreferences,
  setProviderConfig,
  removeProvider,
  testProviderConnection,
  healthCheckAll,
} from "./config-service";
