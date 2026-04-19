import { NextRequest, NextResponse } from "next/server";
import {
  normalizeBusinessProfile,
  validateCanonicalProfile,
  computeIdentityConfidence,
  diffCanonicalVsFound,
  scoreCitationImpact,
  prioritizeFixActions,
} from "@/lib/canonical-identity";
import type { ConfidenceInput } from "@/lib/canonical-identity";

/**
 * POST /api/canonical-identity
 * Normalize, validate, and score business identity data.
 * Returns the canonical profile, validation issues, confidence score,
 * and optional diffs against found listings.
 *
 * Body: {
 *   businessData: RawBusinessInput,
 *   foundListings?: Array<{ directory: string; tier: string; data: Record<string,any> }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessData, foundListings } = body;

    if (!businessData) {
      return NextResponse.json(
        { error: "businessData is required" },
        { status: 400 }
      );
    }

    // 1. Normalize
    const canonical = normalizeBusinessProfile(businessData);

    // 2. Validate
    const validationIssues = validateCanonicalProfile(canonical);

    // 3. Confidence scoring
    const confidenceInputs: ConfidenceInput[] = [
      "businessName", "streetAddress", "city", "state", "postalCode",
      "phone", "website", "categories", "hours",
    ].map((field) => ({
      field,
      value: (canonical as any)[field],
      sources: businessData._sources?.[field] || ["user_input"],
      lastVerified: businessData._lastVerified?.[field] || null,
      hasValidation: validationIssues.filter((v) => v.field === field && v.severity === "error").length === 0,
    }));

    const confidence = computeIdentityConfidence(confidenceInputs);

    // 4. Optional diffs against found listings
    let diffs: any[] = [];
    let prioritizedActions: any[] = [];
    if (foundListings && Array.isArray(foundListings)) {
      for (const listing of foundListings) {
        const listingDiffs = diffCanonicalVsFound(canonical, listing.data);
        const actions = prioritizeFixActions(listingDiffs, listing.directory, listing.tier || "major");
        diffs.push({ directory: listing.directory, diffs: listingDiffs });
        prioritizedActions.push(...actions);
      }
      prioritizedActions.sort((a, b) => b.impact.impactScore - a.impact.impactScore);
    }

    return NextResponse.json({
      canonical,
      validationIssues,
      confidence,
      diffs: diffs.length > 0 ? diffs : undefined,
      prioritizedActions: prioritizedActions.length > 0 ? prioritizedActions : undefined,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Canonical identity error:", error);
    return NextResponse.json(
      { error: "Canonical identity check failed", details: msg },
      { status: 500 }
    );
  }
}
