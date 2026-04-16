import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import * as cheerio from "cheerio";

/**
 * POST /api/citations
 * Check NAP (Name, Address, Phone) consistency across major directories.
 * Body: { businessName, address, phone, city, state }
 */

const DIRECTORY_FIX_INFO: Record<string, { claimUrl: string; fixSteps: string[] }> = {
  "Google Business Profile": {
    claimUrl: "https://business.google.com/",
    fixSteps: ["Go to business.google.com", "Sign in with your Google account", "Search for your business", "Click 'Manage now' or 'Add your business'", "Verify your ownership via postcard, phone, or email"]
  },
  "Yelp": {
    claimUrl: "https://biz.yelp.com/",
    fixSteps: ["Go to biz.yelp.com", "Search for your business", "Click 'Claim this business'", "Verify via phone or email", "Update your NAP information"]
  },
  "BBB": {
    claimUrl: "https://www.bbb.org/get-listed",
    fixSteps: ["Go to bbb.org/get-listed", "Apply for BBB accreditation or free listing", "Submit your business information", "Wait for verification (1-2 weeks)"]
  },
  "Bing Places": {
    claimUrl: "https://www.bingplaces.com/",
    fixSteps: ["Go to bingplaces.com", "Sign in with Microsoft account", "Search for or add your business", "Verify via phone, email, or postcard", "Update your information"]
  },
  "Apple Maps": {
    claimUrl: "https://mapsconnect.apple.com/",
    fixSteps: ["Go to mapsconnect.apple.com", "Sign in with your Apple ID", "Search for your business", "Claim and verify ownership", "Update your NAP details"]
  },
  "Foursquare": {
    claimUrl: "https://foursquare.com/business/claim",
    fixSteps: ["Go to foursquare.com/business/claim", "Search for your business", "Click 'Claim'", "Verify via email", "Update your information"]
  },
  "Manta": {
    claimUrl: "https://www.manta.com/claim",
    fixSteps: ["Go to manta.com", "Search for your business", "Click 'Claim this listing'", "Create account and verify", "Update your business details"]
  },
  "MapQuest": {
    claimUrl: "https://www.mapquest.com/my-business",
    fixSteps: ["Go to mapquest.com/my-business", "Search for your business", "Submit updated information", "Changes typically reflect within 1-2 weeks"]
  },
  "Nextdoor": {
    claimUrl: "https://business.nextdoor.com/",
    fixSteps: ["Go to business.nextdoor.com", "Create a free business page", "Verify your address", "Complete your profile with NAP details"]
  },
  "Hotfrog": {
    claimUrl: "https://www.hotfrog.com/add-your-business",
    fixSteps: ["Go to hotfrog.com", "Click 'Add Your Business'", "Fill in your business details", "Verify via email"]
  },
  "CitySearch": {
    claimUrl: "https://www.citysearch.com/",
    fixSteps: ["Go to citysearch.com", "Search for your business", "Submit updated information via their contact form"]
  },
  "Chamber of Commerce": {
    claimUrl: "https://www.chamberofcommerce.com/add-your-business",
    fixSteps: ["Go to chamberofcommerce.com", "Click 'Add Your Business'", "Fill in your details", "Verify via email"]
  },
  "Superpages": {
    claimUrl: "https://www.superpages.com/",
    fixSteps: ["Go to superpages.com", "Search for your business", "Click 'Claim' or 'Update'", "Submit corrected information"]
  },
  "Brownbook": {
    claimUrl: "https://www.brownbook.net/add-your-business/",
    fixSteps: ["Go to brownbook.net", "Click 'Add Your Business'", "Fill in your NAP details", "Submit for review"]
  },
  "EZLocal": {
    claimUrl: "https://www.ezlocal.com/add-business",
    fixSteps: ["Go to ezlocal.com", "Click 'Add Business'", "Fill in your details", "Submit for listing"]
  },
  "ShowMeLocal": {
    claimUrl: "https://www.showmelocal.com/",
    fixSteps: ["Go to showmelocal.com", "Click 'Add Business'", "Fill in your information", "Submit"]
  },
  "US City": {
    claimUrl: "https://www.uscity.net/",
    fixSteps: ["Go to uscity.net", "Submit your business information via their form"]
  },
  "Tupalo": {
    claimUrl: "https://www.tupalo.co/",
    fixSteps: ["Go to tupalo.co", "Create an account", "Add or claim your business", "Update NAP details"]
  },
};

interface CitationResult {
  directory: string;
  url: string;
  found: boolean;
  nameMatch: boolean | null;
  addressMatch: boolean | null;
  phoneMatch: boolean | null;
  consistencyScore: number;
  details: string;
  icon: string;
  claimUrl: string | null;
  fixSteps: string[];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { businessName, address, phone, city, state } = await req.json();

    if (!businessName || !city || !state) {
      return NextResponse.json(
        { error: "businessName, city, and state are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // Check 18 directories in parallel (API: Google + Yelp; scraped: 16 others)
    const directoryNames = [
      "Google Business Profile", "Yelp",
      "Bing Places", "Apple Maps", "Foursquare", "Manta", "MapQuest", "BBB",
      "Nextdoor", "Hotfrog", "CitySearch", "Chamber of Commerce",
      "Superpages", "Brownbook", "EZLocal", "ShowMeLocal", "US City", "Tupalo",
    ];
    const directories = [
      // === MAJOR DIRECTORIES (API-backed) ===
      checkGooglePlaces(businessName, city, state, address, phone, apiKey),
      checkYelpFusion(businessName, city, state, phone),
      checkDirectoryPresence(
        "Bing Places",
        `https://www.bing.com/maps?q=${encodeURIComponent(`${businessName} ${city} ${state}`)}`,
        businessName,
        phone,
        "🔷"
      ),
      checkDirectoryPresence(
        "Apple Maps",
        `https://maps.apple.com/?q=${encodeURIComponent(`${businessName} ${city} ${state}`)}`,
        businessName,
        phone,
        "🍎"
      ),
      checkDirectoryPresence(
        "Foursquare",
        `https://foursquare.com/explore?near=${encodeURIComponent(`${city}, ${state}`)}&q=${encodeURIComponent(businessName)}`,
        businessName,
        phone,
        "🟣"
      ),
      checkDirectoryPresence(
        "Manta",
        `https://www.manta.com/search?search_source=nav&search[]=keywords:${encodeURIComponent(businessName)}&search[]=location:${encodeURIComponent(`${city} ${state}`)}`,
        businessName,
        phone,
        "🟠"
      ),
      checkDirectoryPresence(
        "MapQuest",
        `https://www.mapquest.com/search/results?query=${encodeURIComponent(`${businessName} ${city} ${state}`)}`,
        businessName,
        phone,
        "🗺️"
      ),
      // === CORE DIRECTORIES (scraped) ===
      checkDirectoryPresence(
        "BBB",
        `https://www.bbb.org/search?find_text=${encodeURIComponent(businessName)}&find_loc=${encodeURIComponent(`${city}, ${state}`)}`,
        businessName,
        phone,
        "🏛️"
      ),
      // === REGIONAL / SPECIALTY DIRECTORIES ===
      checkDirectoryPresence(
        "Nextdoor",
        `https://nextdoor.com/pages/search/?query=${encodeURIComponent(`${businessName} ${city} ${state}`)}`,
        businessName,
        phone,
        "🏘️"
      ),
      checkDirectoryPresence(
        "Hotfrog",
        `https://www.hotfrog.com/search/${encodeURIComponent(state)}/${encodeURIComponent(city)}/${encodeURIComponent(businessName)}`,
        businessName,
        phone,
        "🐸"
      ),
      checkDirectoryPresence(
        "CitySearch",
        `https://www.citysearch.com/search?what=${encodeURIComponent(businessName)}&where=${encodeURIComponent(`${city} ${state}`)}`,
        businessName,
        phone,
        "🏙️"
      ),
      checkDirectoryPresence(
        "Chamber of Commerce",
        `https://www.chamberofcommerce.com/search?q=${encodeURIComponent(`${businessName} ${city} ${state}`)}`,
        businessName,
        phone,
        "🤝"
      ),
      checkDirectoryPresence(
        "Superpages",
        `https://www.superpages.com/search?search_terms=${encodeURIComponent(businessName)}&geo_location_terms=${encodeURIComponent(`${city} ${state}`)}`,
        businessName,
        phone,
        "📖"
      ),
      checkDirectoryPresence(
        "Brownbook",
        `https://www.brownbook.net/businesses/?query=${encodeURIComponent(`${businessName} ${city} ${state}`)}`,
        businessName,
        phone,
        "📗"
      ),
      checkDirectoryPresence(
        "EZLocal",
        `https://www.ezlocal.com/search?q=${encodeURIComponent(businessName)}&l=${encodeURIComponent(`${city} ${state}`)}`,
        businessName,
        phone,
        "📍"
      ),
      checkDirectoryPresence(
        "ShowMeLocal",
        `https://www.showmelocal.com/search?q=${encodeURIComponent(businessName)}&l=${encodeURIComponent(`${city} ${state}`)}`,
        businessName,
        phone,
        "🔎"
      ),
      checkDirectoryPresence(
        "US City",
        `https://www.uscity.net/search?q=${encodeURIComponent(`${businessName} ${city} ${state}`)}`,
        businessName,
        phone,
        "🇺🇸"
      ),
      checkDirectoryPresence(
        "Tupalo",
        `https://www.tupalo.co/search?q=${encodeURIComponent(`${businessName} ${city} ${state}`)}`,
        businessName,
        phone,
        "📌"
      ),
    ];

    const results = await Promise.allSettled(directories);
    const rawCitations: CitationResult[] = results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : {
            directory: directoryNames[i] || "Unknown",
            url: "",
            found: false,
            nameMatch: null,
            addressMatch: null,
            phoneMatch: null,
            consistencyScore: 0,
            details: "Check failed",
            icon: "📍",
            claimUrl: null,
            fixSteps: [],
          }
    );

    // Enrich each citation with fix info
    const citations: CitationResult[] = rawCitations.map(c => {
      const fixInfo = DIRECTORY_FIX_INFO[c.directory];
      return {
        ...c,
        claimUrl: fixInfo?.claimUrl ?? null,
        fixSteps: fixInfo?.fixSteps ?? [],
      };
    });

    // Calculate overall consistency score
    const foundCitations = citations.filter((c) => c.found);
    const overallScore =
      citations.length > 0
        ? Math.round(
            citations.reduce((sum, c) => sum + c.consistencyScore, 0) /
              citations.length
          )
        : 0;

    return NextResponse.json({
      businessName,
      location: `${city}, ${state}`,
      citations,
      summary: {
        totalDirectories: citations.length,
        foundIn: foundCitations.length,
        overallConsistencyScore: overallScore,
        grade:
          overallScore >= 80
            ? "A"
            : overallScore >= 60
            ? "B"
            : overallScore >= 40
            ? "C"
            : overallScore >= 20
            ? "D"
            : "F",
      },
      recommendations: generateCitationRecommendations(citations, businessName),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Citations check error:", error);
    return NextResponse.json(
      { error: "Failed to check citations", message: msg },
      { status: 500 }
    );
  }
}

async function checkYelpFusion(
  businessName: string,
  city: string,
  state: string,
  phone: string | undefined
): Promise<CitationResult> {
  const apiKey = process.env.YELP_API_KEY;
  const searchUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(businessName)}&find_loc=${encodeURIComponent(`${city}, ${state}`)}`;

  if (!apiKey) {
    return {
      directory: "Yelp",
      url: searchUrl,
      found: false,
      nameMatch: null,
      addressMatch: null,
      phoneMatch: null,
      consistencyScore: 0,
      details: "Yelp API key not configured",
      icon: "⭐",
      claimUrl: null,
      fixSteps: [],
    };
  }

  try {
    const query = encodeURIComponent(businessName);
    const location = encodeURIComponent(`${city}, ${state}`);
    const res = await fetch(
      `https://api.yelp.com/v3/businesses/search?term=${query}&location=${location}&limit=5`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return {
        directory: "Yelp",
        url: searchUrl,
        found: false,
        nameMatch: null,
        addressMatch: null,
        phoneMatch: null,
        consistencyScore: 20,
        details: `Yelp API returned ${res.status}`,
        icon: "⭐",
        claimUrl: null,
        fixSteps: [],
      };
    }

    const data = (await res.json()) as {
      businesses?: {
        name?: string;
        alias?: string;
        url?: string;
        phone?: string;
        rating?: number;
        review_count?: number;
        location?: { display_address?: string[] };
      }[];
    };

    const businesses = data.businesses ?? [];
    const match = businesses.find((b) =>
      b.name?.toLowerCase().includes(businessName.toLowerCase())
    );

    if (!match) {
      return {
        directory: "Yelp",
        url: searchUrl,
        found: false,
        nameMatch: false,
        addressMatch: null,
        phoneMatch: null,
        consistencyScore: 10,
        details: "Business not found on Yelp",
        icon: "⭐",
        claimUrl: null,
        fixSteps: [],
      };
    }

    const phoneNormalized = phone?.replace(/\D/g, "");
    const yelpPhone = match.phone?.replace(/\D/g, "");
    const phoneMatch =
      phoneNormalized && yelpPhone
        ? phoneNormalized === yelpPhone ||
          phoneNormalized.endsWith(yelpPhone) ||
          yelpPhone.endsWith(phoneNormalized)
        : null;

    let score = 40;
    if (match.name?.toLowerCase().includes(businessName.toLowerCase())) score += 30;
    if (phoneMatch === true) score += 30;
    else if (phoneMatch === null) score += 15;

    const yelpAddress = match.location?.display_address?.join(", ") ?? "";

    return {
      directory: "Yelp",
      url: match.url ?? `https://www.yelp.com/biz/${match.alias ?? ""}`,
      found: true,
      nameMatch: true,
      addressMatch: null,
      phoneMatch,
      consistencyScore: Math.min(score, 100),
      details: [
        `Found: ${match.name}`,
        match.rating != null ? `${match.rating}\u2605` : "",
        match.review_count != null ? `(${match.review_count} reviews)` : "",
        yelpAddress,
      ].filter(Boolean).join(" · "),
      icon: "⭐",
      claimUrl: null,
      fixSteps: [],
    };
  } catch {
    return {
      directory: "Yelp",
      url: searchUrl,
      found: false,
      nameMatch: null,
      addressMatch: null,
      phoneMatch: null,
      consistencyScore: 10,
      details: "Yelp API check failed",
      icon: "⭐",
      claimUrl: null,
      fixSteps: [],
    };
  }
}

async function checkGooglePlaces(
  businessName: string,
  city: string,
  state: string,
  address: string | undefined,
  phone: string | undefined,
  apiKey: string | undefined
): Promise<CitationResult> {
  if (!apiKey) {
    return {
      directory: "Google Business Profile",
      url: `https://www.google.com/search?q=${encodeURIComponent(businessName + " " + city + " " + state)}`,
      found: false,
      nameMatch: null,
      addressMatch: null,
      phoneMatch: null,
      consistencyScore: 0,
      details: "Google API key not configured",
      icon: "🔍",
      claimUrl: null,
      fixSteps: [],
    };
  }

  try {
    const query = `${businessName} ${city} ${state}`;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = (await res.json()) as {
      results?: { name?: string; formatted_address?: string }[];
    };

    if (!data.results || data.results.length === 0) {
      return {
        directory: "Google Business Profile",
        url: `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
        found: false,
        nameMatch: false,
        addressMatch: null,
        phoneMatch: null,
        consistencyScore: 0,
        details: "No listing found on Google Maps",
        icon: "🔍",
        claimUrl: null,
        fixSteps: [],
      };
    }

    const place = data.results[0];
    const nameMatch = !!place.name
      ?.toLowerCase()
      .includes(businessName.toLowerCase());
    const addressMatch = address
      ? !!place.formatted_address
          ?.toLowerCase()
          .includes(address.toLowerCase().split(",")[0])
      : null;

    let score = 40;
    if (nameMatch) score += 30;
    if (addressMatch) score += 30;

    return {
      directory: "Google Business Profile",
      url: `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      found: true,
      nameMatch,
      addressMatch,
      phoneMatch: null,
      consistencyScore: Math.min(score, 100),
      details: `Found: ${place.name} — ${place.formatted_address}`,
      icon: "🔍",
      claimUrl: null,
      fixSteps: [],
    };
  } catch {
    return {
      directory: "Google Business Profile",
      url: "",
      found: false,
      nameMatch: null,
      addressMatch: null,
      phoneMatch: null,
      consistencyScore: 0,
      details: "Google Places API check failed",
      icon: "🔍",
      claimUrl: null,
      fixSteps: [],
    };
  }
}

async function checkDirectoryPresence(
  directory: string,
  searchUrl: string,
  businessName: string,
  phone: string | undefined,
  icon: string
): Promise<CitationResult> {
  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        directory,
        url: searchUrl,
        found: false,
        nameMatch: null,
        addressMatch: null,
        phoneMatch: null,
        consistencyScore: 20,
        details: `Could not access ${directory} (HTTP ${res.status})`,
        icon,
        claimUrl: null,
        fixSteps: [],
      };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const bodyText = $("body").text().toLowerCase();
    const nameFound = bodyText.includes(businessName.toLowerCase());
    const phoneNormalized = phone?.replace(/\D/g, "");
    const phoneFound = phoneNormalized
      ? bodyText.includes(phoneNormalized) ||
        bodyText.includes(
          phoneNormalized.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
        )
      : null;

    let score = 20;
    if (nameFound) score += 40;
    if (phoneFound === true) score += 40;
    if (phoneFound === null && nameFound) score += 20;

    return {
      directory,
      url: searchUrl,
      found: nameFound,
      nameMatch: nameFound,
      addressMatch: null,
      phoneMatch: phoneFound,
      consistencyScore: Math.min(score, 100),
      details: nameFound
        ? `Business name found on ${directory}${phoneFound ? " with matching phone" : ""}`
        : `Business not found in ${directory} search results`,
      icon,
      claimUrl: null,
      fixSteps: [],
    };
  } catch {
    return {
      directory,
      url: searchUrl,
      found: false,
      nameMatch: null,
      addressMatch: null,
      phoneMatch: null,
      consistencyScore: 10,
      details: `Could not connect to ${directory}`,
      icon,
      claimUrl: null,
      fixSteps: [],
    };
  }
}

function generateCitationRecommendations(
  citations: CitationResult[],
  businessName: string
): string[] {
  const recs: string[] = [];

  const notFound = citations.filter((c) => !c.found);
  if (notFound.length > 0) {
    recs.push(
      `Claim your listing on: ${notFound.map((c) => c.directory).join(", ")}`
    );
  }

  const phoneIssues = citations.filter(
    (c) => c.found && c.phoneMatch === false
  );
  if (phoneIssues.length > 0) {
    recs.push(
      `Update phone number on: ${phoneIssues.map((c) => c.directory).join(", ")}`
    );
  }

  const nameIssues = citations.filter(
    (c) => c.found && c.nameMatch === false
  );
  if (nameIssues.length > 0) {
    recs.push(
      `Business name mismatch on: ${nameIssues.map((c) => c.directory).join(", ")} — ensure it matches "${businessName}" exactly`
    );
  }

  if (recs.length === 0) {
    recs.push("Your citations look consistent! Keep monitoring for accuracy.");
  }

  return recs;
}
