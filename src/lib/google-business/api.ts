// ============================================================
// Google Business Profile — API Data Fetching Layer
// ============================================================

const GBP_API_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const GBP_ACCOUNT_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const GBP_REVIEWS_BASE = "https://mybusiness.googleapis.com/v4";

interface FetchOptions {
  accessToken: string;
}

async function gbpFetch(url: string, opts: FetchOptions) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GBP API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ---------- Accounts ----------

export interface GoogleAccount {
  name: string; // "accounts/123456"
  accountName: string;
  type: string;
  role: string;
  state: { status: string };
}

/**
 * List all GBP accounts the user has access to.
 */
export async function listAccounts(accessToken: string): Promise<GoogleAccount[]> {
  const data = await gbpFetch(`${GBP_ACCOUNT_BASE}/accounts`, { accessToken });
  return data.accounts || [];
}

// ---------- Locations ----------

export interface GoogleLocation {
  name: string; // "locations/123456"
  title: string;
  phoneNumbers?: { primaryPhone?: string };
  categories?: {
    primaryCategory?: { displayName: string; name: string };
    additionalCategories?: { displayName: string; name: string }[];
  };
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  websiteUri?: string;
  regularHours?: {
    periods: {
      openDay: string;
      openTime: { hours: number; minutes: number };
      closeDay: string;
      closeTime: { hours: number; minutes: number };
    }[];
  };
  specialHours?: {
    specialHourPeriods: {
      startDate: { year: number; month: number; day: number };
      openTime?: { hours: number; minutes: number };
      closeTime?: { hours: number; minutes: number };
      closed?: boolean;
    }[];
  };
  profile?: { description?: string };
  metadata?: {
    mapsUri?: string;
    newReviewUri?: string;
    hasGoogleUpdated?: boolean;
  };
  latlng?: { latitude: number; longitude: number };
  openInfo?: { status: string };
  serviceItems?: {
    structuredServiceItem?: {
      serviceTypeId: string;
      description?: string;
    };
    freeFormServiceItem?: {
      category?: string;
      label?: { displayName: string };
    };
    price?: { currencyCode: string; units: string };
  }[];
}

/**
 * List all locations under a given account.
 */
export async function listLocations(
  accessToken: string,
  accountId: string
): Promise<GoogleLocation[]> {
  // The v1 API uses the readMask to select fields
  const readMask = [
    "name",
    "title",
    "phoneNumbers",
    "categories",
    "storefrontAddress",
    "websiteUri",
    "regularHours",
    "specialHours",
    "profile",
    "metadata",
    "latlng",
    "openInfo",
    "serviceItems",
  ].join(",");

  const data = await gbpFetch(
    `${GBP_API_BASE}/${accountId}/locations?readMask=${readMask}`,
    { accessToken }
  );
  return data.locations || [];
}

/**
 * Get a single location by full resource name.
 */
export async function getLocation(
  accessToken: string,
  locationName: string
): Promise<GoogleLocation> {
  const readMask = [
    "name",
    "title",
    "phoneNumbers",
    "categories",
    "storefrontAddress",
    "websiteUri",
    "regularHours",
    "specialHours",
    "profile",
    "metadata",
    "latlng",
    "openInfo",
    "serviceItems",
  ].join(",");

  return gbpFetch(
    `${GBP_API_BASE}/${locationName}?readMask=${readMask}`,
    { accessToken }
  );
}

// ---------- Reviews ----------

export interface GoogleReview {
  name: string;
  reviewId: string;
  reviewer: {
    profilePhotoUrl?: string;
    displayName: string;
  };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

/**
 * List reviews for a location (paginated).
 */
export async function listReviews(
  accessToken: string,
  accountName: string,
  locationName: string,
  pageSize = 50,
  pageToken?: string
): Promise<{ reviews: GoogleReview[]; nextPageToken?: string; totalReviewCount: number; averageRating: number }> {
  const locId = locationName.replace("locations/", "");
  let url = `${GBP_REVIEWS_BASE}/${accountName}/locations/${locId}/reviews?pageSize=${pageSize}`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  return gbpFetch(url, { accessToken });
}

// ---------- Media / Photos ----------

export interface GoogleMediaItem {
  name: string;
  mediaFormat: string;
  locationAssociation?: { category: string };
  googleUrl?: string;
  thumbnailUrl?: string;
  createTime: string;
}

/**
 * List media items (photos) for a location.
 */
export async function listMedia(
  accessToken: string,
  accountName: string,
  locationName: string
): Promise<GoogleMediaItem[]> {
  const locId = locationName.replace("locations/", "");
  try {
    const data = await gbpFetch(
      `${GBP_REVIEWS_BASE}/${accountName}/locations/${locId}/media`,
      { accessToken }
    );
    return data.mediaItems || [];
  } catch {
    // Media endpoint can fail if no photos
    return [];
  }
}

// ---------- Posts ----------

export interface GooglePost {
  name: string;
  languageCode?: string;
  summary?: string;
  callToAction?: { actionType: string; url: string };
  media?: { sourceUrl: string; mediaFormat: string }[];
  topicType: string;
  createTime: string;
  updateTime: string;
  event?: {
    title?: string;
    schedule?: { startDate: any; endDate: any; startTime?: any; endTime?: any };
  };
}

/**
 * List posts for a location.
 */
export async function listPosts(
  accessToken: string,
  accountName: string,
  locationName: string
): Promise<GooglePost[]> {
  const locId = locationName.replace("locations/", "");
  try {
    const data = await gbpFetch(
      `${GBP_REVIEWS_BASE}/${accountName}/locations/${locId}/localPosts`,
      { accessToken }
    );
    return data.localPosts || [];
  } catch {
    return [];
  }
}

// ---------- Q&A ----------

export interface GoogleQuestion {
  name: string;
  author: { displayName: string };
  text: string;
  createTime: string;
  topAnswers?: {
    author: { displayName: string };
    text: string;
    createTime: string;
  }[];
  totalAnswerCount: number;
}

/**
 * List Q&A for a location.
 */
export async function listQuestions(
  accessToken: string,
  accountName: string,
  locationName: string
): Promise<GoogleQuestion[]> {
  const locId = locationName.replace("locations/", "");
  try {
    const data = await gbpFetch(
      `${GBP_REVIEWS_BASE}/${accountName}/locations/${locId}/questions`,
      { accessToken }
    );
    return data.questions || [];
  } catch {
    return [];
  }
}

// ---------- Helpers ----------

/** Convert Google star rating string to numeric value */
export function starRatingToNumber(rating: string): 1 | 2 | 3 | 4 | 5 {
  const map: Record<string, 1 | 2 | 3 | 4 | 5> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[rating] || 5;
}

/** Format time object {hours, minutes} to "HH:MM" string */
export function formatTime(t: { hours: number; minutes?: number }): string {
  const h = String(t.hours).padStart(2, "0");
  const m = String(t.minutes || 0).padStart(2, "0");
  return `${h}:${m}`;
}
