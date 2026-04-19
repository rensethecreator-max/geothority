/**
 * Vendasta Business Listings Adapter
 * Docs: https://developers.vendasta.com/
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

export class VendastaAdapter extends BaseAggregatorAdapter {
  readonly provider = "vendasta" as const;
  private readonly baseUrl = "https://business-listings-api.vendasta.com/api/v2";

  constructor(config: AggregatorAdapterConfig) {
    super(config);
  }

  private async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: Record<string, unknown> }> {
    const apiKey = this.getCredential("apiKey");
    const res = await fetch(`${this.baseUrl}${path}?apiKey=${apiKey}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      const { status, data } = await this.request("GET", "/account/status");
      return status === 200
        ? { success: true, message: "Vendasta connection verified", providerId: String(data.accountId ?? "") }
        : { success: false, message: `HTTP ${status}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  async pushBusiness(data: CanonicalBusinessData): Promise<PushResult> {
    const payload = this.mapPayload(data);
    try {
      const { status, data: res } = await this.request("POST", "/location", payload);
      if (status === 200 || status === 201) {
        return this.buildPushResult(
          { providerLocationId: String(res.locationId ?? res.id ?? "") },
          Object.keys(payload)
        );
      }
      return this.buildPushResult(
        { success: false, errors: [{ field: "_root", message: JSON.stringify(res) }] },
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
    const { status, data } = await this.request("GET", `/location/${businessId}`);
    return {
      providerLocationId: businessId,
      lastSyncedAt: new Date().toISOString(),
      status: status === 200 ? "active" : "error",
      data: this.mapResponse(data),
      providerRaw: data,
    };
  }

  async deleteListing(businessId: string): Promise<DeleteResult> {
    const { status } = await this.request("DELETE", `/location/${businessId}`);
    return { success: status < 300, message: status < 300 ? "Listing removed" : `Failed (HTTP ${status})` };
  }

  mapPayload(data: CanonicalBusinessData): Record<string, unknown> {
    return {
      companyName: data.businessName,
      address: {
        street: data.streetAddress,
        city: data.city,
        state: data.state,
        zip: data.postalCode,
        country: data.country,
      },
      workNumber: data.phone,
      websiteUrl: data.website,
      description: data.description,
      categoryIds: data.categories,
      hoursOfOperation: this.hoursToArray(data.hours),
      latitude: data.geo?.lat,
      longitude: data.geo?.lng,
      logoUrl: data.logoUrl,
      imageUrls: data.photoUrls,
      socialUrls: data.socialProfiles,
      paymentOptions: data.paymentMethods,
      yearEstablished: data.yearEstablished,
      languages: data.languages,
      services: data.services,
    };
  }

  mapResponse(raw: Record<string, unknown>): Partial<ListingState["data"]> {
    const addr = raw.address as Record<string, string> | undefined;
    return {
      businessName: String(raw.companyName ?? ""),
      streetAddress: addr?.street ?? "",
      city: addr?.city ?? "",
      state: addr?.state ?? "",
      postalCode: addr?.zip ?? "",
      phone: String(raw.workNumber ?? ""),
      website: String(raw.websiteUrl ?? ""),
      description: String(raw.description ?? ""),
      categories: (raw.categoryIds as string[]) ?? [],
    };
  }

  async healthCheck(): Promise<"ok" | "degraded" | "down"> {
    try {
      const { status } = await this.request("GET", "/status");
      return status < 300 ? "ok" : "degraded";
    } catch {
      return "down";
    }
  }
}
