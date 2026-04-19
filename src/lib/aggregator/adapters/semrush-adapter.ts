/**
 * Semrush Listing Management Adapter
 * Docs: https://www.semrush.com/listing-management/api/
 */

import { BaseAggregatorAdapter } from "../base-adapter";
import type {
  AggregatorAdapterConfig,
  CanonicalBusinessData,
  ConnectionResult,
  DeleteResult,
  ListingState,
  PushResult,
} from "../types";

export class SemrushAdapter extends BaseAggregatorAdapter {
  readonly provider = "semrush" as const;
  private readonly baseUrl = "https://api.semrush.com/listing/v1";

  constructor(config: AggregatorAdapterConfig) {
    super(config);
  }

  // ─── API Client ────────────────────────────────────────────────────────

  private async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: Record<string, unknown> }> {
    const apiKey = this.getCredential("apiKey");
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // ─── Interface Implementation ──────────────────────────────────────────

  async testConnection(): Promise<ConnectionResult> {
    try {
      const { status, data } = await this.request("GET", "/account");
      if (status === 200) {
        return {
          success: true,
          message: "Semrush connection verified",
          providerId: String(data.accountId ?? ""),
        };
      }
      return { success: false, message: `HTTP ${status}: ${JSON.stringify(data)}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  async pushBusiness(data: CanonicalBusinessData): Promise<PushResult> {
    const payload = this.mapPayload(data);
    try {
      const { status, data: res } = await this.request("POST", "/locations", payload);
      if (status === 200 || status === 201) {
        return this.buildPushResult(
          { providerLocationId: String(res.locationId ?? res.id ?? "") },
          Object.keys(payload)
        );
      }
      return this.buildPushResult(
        {
          success: false,
          errors: [{ field: "_root", message: JSON.stringify(res) }],
        },
        []
      );
    } catch (err: any) {
      return this.buildPushResult(
        { success: false, errors: [{ field: "_root", message: err.message }] },
        []
      );
    }
  }

  async pullListing(businessId: string): Promise<ListingState> {
    const { status, data } = await this.request("GET", `/locations/${businessId}`);
    return {
      providerLocationId: businessId,
      lastSyncedAt: new Date().toISOString(),
      status: status === 200 ? "active" : "error",
      data: this.mapResponse(data),
      providerRaw: data,
    };
  }

  async deleteListing(businessId: string): Promise<DeleteResult> {
    const { status } = await this.request("DELETE", `/locations/${businessId}`);
    return {
      success: status === 200 || status === 204,
      message: status < 300 ? "Listing deleted" : `Delete failed (HTTP ${status})`,
    };
  }

  mapPayload(data: CanonicalBusinessData): Record<string, unknown> {
    return {
      business_name: data.businessName,
      street_address: data.streetAddress,
      city: data.city,
      state: data.state,
      postal_code: data.postalCode,
      country: data.country,
      phone: data.phone,
      website: data.website,
      description: data.description,
      primary_category: data.categories[0] ?? "",
      additional_categories: data.categories.slice(1),
      hours: this.hoursToArray(data.hours),
      latitude: data.geo?.lat,
      longitude: data.geo?.lng,
      logo_url: data.logoUrl,
      photo_urls: data.photoUrls,
      social_profiles: data.socialProfiles,
      payment_methods: data.paymentMethods,
      year_established: data.yearEstablished,
      languages: data.languages,
    };
  }

  mapResponse(raw: Record<string, unknown>): Partial<ListingState["data"]> {
    return {
      businessName: String(raw.business_name ?? ""),
      streetAddress: String(raw.street_address ?? ""),
      city: String(raw.city ?? ""),
      state: String(raw.state ?? ""),
      postalCode: String(raw.postal_code ?? ""),
      phone: String(raw.phone ?? ""),
      website: String(raw.website ?? ""),
      description: String(raw.description ?? ""),
      categories: [
        String(raw.primary_category ?? ""),
        ...((raw.additional_categories as string[]) ?? []),
      ].filter(Boolean),
    };
  }

  async healthCheck(): Promise<"ok" | "degraded" | "down"> {
    try {
      const { status } = await this.request("GET", "/health");
      return status < 300 ? "ok" : "degraded";
    } catch {
      return "down";
    }
  }
}
