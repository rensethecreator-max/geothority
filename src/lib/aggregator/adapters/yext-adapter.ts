/**
 * Yext PowerListings Adapter
 * Docs: https://hitchhikers.yext.com/docs/
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

export class YextAdapter extends BaseAggregatorAdapter {
  readonly provider = "yext" as const;
  private readonly baseUrl = "https://api.yext.com/v2";

  constructor(config: AggregatorAdapterConfig) {
    super(config);
  }

  private async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: Record<string, unknown> }> {
    const apiKey = this.getCredential("apiKey");
    const accountId = this.getCredential("accountId");
    const res = await fetch(`${this.baseUrl}${path}?api_key=${apiKey}&account_id=${accountId}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      const { status, data } = await this.request("GET", "/accounts/me");
      if (status === 200) {
        return {
          success: true,
          message: "Yext connection verified",
          providerId: String(data.accountId ?? data.id ?? ""),
        };
      }
      return { success: false, message: `HTTP ${status}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  async pushBusiness(data: CanonicalBusinessData): Promise<PushResult> {
    const payload = this.mapPayload(data);
    try {
      const { status, data: res } = await this.request("POST", "/entities", payload);
      if (status === 200 || status === 201) {
        const entityId = String((res.meta as any)?.entityId ?? (res as any).entityId ?? "");
        return this.buildPushResult({ providerLocationId: entityId }, Object.keys(payload));
      }
      const errors = (res.errors as Array<{ field: string; message: string }>)?.map((e) => ({
        field: e.field,
        message: e.message,
      })) ?? [{ field: "_root", message: JSON.stringify(res) }];
      return this.buildPushResult({ success: false, errors }, []);
    } catch (err: any) {
      return this.buildPushResult(
        { success: false, errors: [{ field: "_root", message: err.message }] },
        []
      );
    }
  }

  async pullListing(businessId: string): Promise<ListingState> {
    const { status, data } = await this.request("GET", `/entities/${businessId}`);
    return {
      providerLocationId: businessId,
      lastSyncedAt: new Date().toISOString(),
      status: status === 200 ? "active" : "error",
      data: this.mapResponse(data),
      providerRaw: data,
    };
  }

  async deleteListing(businessId: string): Promise<DeleteResult> {
    const { status } = await this.request("DELETE", `/entities/${businessId}`);
    return { success: status < 300, message: status < 300 ? "Entity deleted" : `Failed (HTTP ${status})` };
  }

  mapPayload(data: CanonicalBusinessData): Record<string, unknown> {
    return {
      entity: {
        type: "location",
        name: data.businessName,
        address: {
          line1: data.streetAddress,
          city: data.city,
          region: data.state,
          postalCode: data.postalCode,
          countryCode: data.country,
        },
        mainPhone: data.phone,
        websiteUrl: { url: data.website },
        description: data.description,
        primaryCategory: data.categories[0] ?? "",
        additionalCategories: data.categories.slice(1),
        hours: this.mapYextHours(data.hours),
        geoCoordinates: data.geo
          ? { latitude: data.geo.lat, longitude: data.geo.lng }
          : undefined,
        logo: data.logoUrl ? { url: data.logoUrl } : undefined,
        photos: data.photoUrls.map((u) => ({ url: u })),
        googleMyBusiness: data.socialProfiles.google
          ? { url: data.socialProfiles.google }
          : undefined,
        paymentOptions: data.paymentMethods,
        yearEstablished: data.yearEstablished,
        languages: data.languages,
        services: data.services,
        emails: data.email ? [data.email] : [],
        attributes: data.attributes,
      },
    };
  }

  /** Yext expects hours in a specific nested format */
  private mapYextHours(
    hours: CanonicalBusinessData["hours"]
  ): Record<string, Array<{ open: string; close: string }>> {
    const result: Record<string, Array<{ open: string; close: string }>> = {};
    for (const [day, h] of Object.entries(hours)) {
      if (h) {
        result[day.toUpperCase()] = [{ open: h.open, close: h.close }];
      }
    }
    return result;
  }

  mapResponse(raw: Record<string, unknown>): Partial<ListingState["data"]> {
    const entity = (raw.entity ?? raw) as Record<string, unknown>;
    const addr = entity.address as Record<string, string> | undefined;
    return {
      businessName: String(entity.name ?? ""),
      streetAddress: addr?.line1 ?? "",
      city: addr?.city ?? "",
      state: addr?.region ?? "",
      postalCode: addr?.postalCode ?? "",
      phone: String(entity.mainPhone ?? ""),
      website: String((entity.websiteUrl as Record<string, string>)?.url ?? ""),
      description: String(entity.description ?? ""),
      categories: [String(entity.primaryCategory ?? ""), ...((entity.additionalCategories as string[]) ?? [])].filter(Boolean),
    };
  }

  async healthCheck(): Promise<"ok" | "degraded" | "down"> {
    try {
      const { status } = await this.request("GET", "/accounts/me");
      return status < 300 ? "ok" : "degraded";
    } catch {
      return "down";
    }
  }
}
