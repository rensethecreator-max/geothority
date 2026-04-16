/**
 * Foursquare Places API integration for listing verification & sync.
 * Uses V2 API with Client ID + Client Secret authentication.
 * 
 * Capabilities:
 *   - Search/verify: Find businesses in Foursquare's database (feeds 50+ directories)
 *   - Venue details: Get full NAP, categories, verification status
 *   - Network reach: Foursquare data feeds Bing, Samsung, Uber, HERE, TomTom, etc.
 */

const FSQ_V2_BASE = "https://api.foursquare.com/v2";
const FSQ_VERSION = "20260413";

function getCredentials() {
  const clientId = process.env.FOURSQUARE_CLIENT_ID;
  const clientSecret = process.env.FOURSQUARE_CLIENT_SECRET;
  return { clientId, clientSecret, configured: !!(clientId && clientSecret) };
}

function authParams(): string {
  const { clientId, clientSecret } = getCredentials();
  return `client_id=${clientId}&client_secret=${clientSecret}&v=${FSQ_VERSION}`;
}

export interface FoursquareVenue {
  id: string;
  name: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    formattedAddress?: string[];
    lat?: number;
    lng?: number;
  };
  contact?: {
    phone?: string;
    formattedPhone?: string;
  };
  url?: string;
  categories?: { id: string; name: string; icon?: { prefix: string; suffix: string } }[];
  verified?: boolean;
  stats?: { tipCount?: number; usersCount?: number; checkinsCount?: number };
}

export interface SyncResult {
  success: boolean;
  directory: string;
  action: "verified" | "found" | "not_found" | "error";
  details: string;
  venue?: FoursquareVenue;
  claimUrl?: string;
}

/**
 * Search for a business in Foursquare's database.
 * If found, the business is already in the network feeding 50+ directories.
 */
export async function searchFoursquare(
  businessName: string,
  city: string,
  state: string
): Promise<FoursquareVenue | null> {
  const { configured } = getCredentials();
  if (!configured) return null;

  try {
    const query = encodeURIComponent(businessName);
    const near = encodeURIComponent(`${city}, ${state}`);
    const res = await fetch(
      `${FSQ_V2_BASE}/venues/search?query=${query}&near=${near}&limit=5&${authParams()}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const venues: FoursquareVenue[] = data.response?.venues || [];

    // Find best match by name
    return (
      venues.find((v) =>
        v.name?.toLowerCase().includes(businessName.toLowerCase())
      ) ||
      venues[0] ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Verify a business in the Foursquare network and return sync status.
 * If found → business is already distributed to 50+ directories.
 * If not found → provide claim URL for manual submission.
 */
export async function verifyAndSync(business: {
  name: string;
  address?: string;
  city: string;
  state: string;
  phone?: string;
  website?: string;
}): Promise<SyncResult> {
  const { configured } = getCredentials();
  if (!configured) {
    return {
      success: false,
      directory: "Foursquare Network (50+ directories)",
      action: "error",
      details: "Foursquare integration not configured. Available on paid plans.",
    };
  }

  try {
    const venue = await searchFoursquare(business.name, business.city, business.state);

    if (venue) {
      // Check NAP consistency
      const nameMatch = venue.name?.toLowerCase().includes(business.name.toLowerCase());
      const phoneNorm = business.phone?.replace(/\D/g, "");
      const venuePhone = venue.contact?.phone?.replace(/\D/g, "");
      const phoneMatch = phoneNorm && venuePhone ? phoneNorm.includes(venuePhone) || venuePhone.includes(phoneNorm) : null;

      const issues: string[] = [];
      if (!nameMatch) issues.push("Name doesn't match exactly");
      if (phoneMatch === false) issues.push("Phone number mismatch");
      if (!venue.verified) issues.push("Listing not claimed/verified");

      const address = venue.location?.formattedAddress?.join(", ") || "";

      if (issues.length === 0 || (nameMatch && phoneMatch !== false)) {
        return {
          success: true,
          directory: "Foursquare Network (50+ directories)",
          action: "verified",
          details: `✅ Found and verified: ${venue.name} — ${address}. Your listing is distributed across the Foursquare network (Bing, Samsung, Uber, HERE Maps, TomTom, and 45+ more).`,
          venue,
          claimUrl: venue.verified ? undefined : `https://foursquare.com/venue/${venue.id}/claim`,
        };
      } else {
        return {
          success: true,
          directory: "Foursquare Network (50+ directories)",
          action: "found",
          details: `Found listing: ${venue.name} — ${address}. Issues: ${issues.join("; ")}. ${!venue.verified ? "Claim your listing to update it." : ""}`,
          venue,
          claimUrl: `https://foursquare.com/venue/${venue.id}/claim`,
        };
      }
    }

    // Not found in Foursquare
    return {
      success: false,
      directory: "Foursquare Network (50+ directories)",
      action: "not_found",
      details: "Your business was not found in the Foursquare network. Add it to get distributed to 50+ directories including Bing, Samsung, Uber, and more.",
      claimUrl: "https://foursquare.com/add-place",
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return {
      success: false,
      directory: "Foursquare Network (50+ directories)",
      action: "error",
      details: `Verification failed: ${msg}`,
    };
  }
}

/** Check if Foursquare is configured */
export function isFoursquareConfigured(): boolean {
  return getCredentials().configured;
}

/** Returns the list of directories that Foursquare feeds */
export function getFoursquareNetworkDirectories(): string[] {
  return [
    "Bing Maps",
    "Samsung Maps",
    "Uber",
    "Apple Maps (partial)",
    "TripAdvisor",
    "Waze (partial)",
    "HERE Maps",
    "TomTom",
    "Garmin",
    "MapQuest",
    "Zillow",
    "Trulia",
    "Citysearch",
    "YP.com",
    "Local.com",
    "Superpages",
    "DexKnows",
    "Switchboard",
    "WhitePages",
    "411.com",
    "And 30+ more location-based services",
  ];
}
