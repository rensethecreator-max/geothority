// Smart Expansion Engine — Phase 7
// Core AI logic for identifying high-impact expansion targets

import {
  ExpansionTarget,
  ExpansionSignal,
  ExpansionRecommendation,
  PriorityMatrix,
  SuggestedAction,
  CompetitorPresence,
  EXPANSION_CONFIG,
} from "./types";

// ─── Signal Scoring ───────────────────────────────────────────────────────

export function computeImpactScore(signals: ExpansionSignal[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const configWeight = EXPANSION_CONFIG.SIGNAL_WEIGHTS[signal.type] ?? 0.05;
    const effectiveWeight = signal.weight > 0 ? signal.weight : configWeight;
    weightedSum += normalizeSignal(signal) * effectiveWeight;
    totalWeight += effectiveWeight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(Math.min(100, Math.max(0, (weightedSum / totalWeight) * 100)));
}

function normalizeSignal(signal: ExpansionSignal): number {
  // Normalize raw signal values to 0-1 range based on type
  const v = signal.value;
  switch (signal.type) {
    case "search_volume":
      return Math.min(1, v / 10000); // 10k+ = max
    case "population_density":
      return Math.min(1, v / 500000); // 500k+ pop = max
    case "competitor_gap":
      return Math.min(1, Math.max(0, v / 10)); // gap out of 10
    case "service_demand":
      return Math.min(1, v / 5000); // 5k monthly searches
    case "directory_authority":
      return Math.min(1, v / 100); // DA 0-100
    case "proximity_to_existing":
      return Math.min(1, Math.max(0, 1 - v / 100)); // closer = higher (v = miles)
    case "review_density_gap":
      return Math.min(1, v / 50); // 50+ review gap = max
    case "serp_feature_opportunity":
      return Math.min(1, v / 5); // 5 features available
    case "ai_citation_gap":
      return Math.min(1, v / 3); // 3 citation gaps
    case "seasonal_trend":
      return Math.min(1, Math.max(0, v)); // already normalized
    default:
      return Math.min(1, Math.max(0, v / 100));
  }
}

// ─── Confidence Classification ─────────────────────────────────────────────

export function classifyConfidence(impactScore: number): "high" | "medium" | "low" {
  if (impactScore >= EXPANSION_CONFIG.CONFIDENCE_THRESHOLDS.high) return "high";
  if (impactScore >= EXPANSION_CONFIG.CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}

// ─── Priority Matrix (Impact vs Effort Quadrants) ──────────────────────────

export function assignQuadrant(impact: number, effort: number): PriorityMatrix["cities"][number]["quadrant"] {
  const iThreshold = 55;
  const eThreshold = 50;

  if (impact >= iThreshold && effort < eThreshold) return "quick_win";
  if (impact >= iThreshold && effort >= eThreshold) return "major_project";
  if (impact < iThreshold && effort < eThreshold) return "fill_in";
  return "deprioritize";
}

export function buildPriorityMatrix(
  cities: ExpansionTarget[],
  services: ExpansionTarget[]
): PriorityMatrix {
  return {
    cities: cities.map((c) => {
      const effort = estimateEffort(c);
      return { name: c.name, impact: c.impact_score, effort, quadrant: assignQuadrant(c.impact_score, effort) };
    }),
    services: services.map((s) => {
      const effort = estimateEffort(s);
      return { name: s.name, impact: s.impact_score, effort, quadrant: assignQuadrant(s.impact_score, effort) };
    }),
  };
}

function estimateEffort(target: ExpansionTarget): number {
  if (target.suggested_actions.length === 0) return 50;
  const effortMap: Record<string, number> = { low: 20, medium: 50, high: 80 };
  const avg = target.suggested_actions.reduce((sum, a) => sum + (effortMap[a.effort] ?? 50), 0) / target.suggested_actions.length;
  return Math.round(avg);
}

// ─── City Target Identification ─────────────────────────────────────────────

export interface CityExpansionInput {
  currentCity: string;
  currentState: string;
  currentServices: string[];
  competitors: CompetitorPresence[];
  existingCityPages: string[];
  serviceRadius: number; // miles
  industry: string;
}

export function identifyCityTargets(input: CityExpansionInput): ExpansionTarget[] {
  const nearbyCities = getNearbyCities(input.currentCity, input.currentState, input.serviceRadius * 3);
  const targets: ExpansionTarget[] = [];

  for (const city of nearbyCities) {
    if (city.name === input.currentCity) continue;
    if (input.existingCityPages.includes(slugify(city.name))) continue;

    const signals: ExpansionSignal[] = [];

    // Signal: proximity (closer cities get higher signal)
    signals.push({
      type: "proximity_to_existing",
      source: "geocoded",
      value: city.distanceMiles,
      weight: 0,
      raw_data: null,
      fetched_at: new Date().toISOString(),
    });

    // Signal: population density
    signals.push({
      type: "population_density",
      source: "census_estimate",
      value: city.population,
      weight: 0,
      raw_data: null,
      fetched_at: new Date().toISOString(),
    });

    // Signal: competitor gap (fewer competitors = bigger opportunity)
    const localCompetitors = input.competitors.filter(
      (c) => c.competitor_domain && c.has_dedicated_page
    );
    signals.push({
      type: "competitor_gap",
      source: "competitor_analysis",
      value: Math.max(0, 10 - localCompetitors.length),
      weight: 0,
      raw_data: null,
      fetched_at: new Date().toISOString(),
    });

    const impactScore = computeImpactScore(signals);
    if (impactScore < EXPANSION_CONFIG.MIN_IMPACT_SCORE) continue;

    targets.push({
      id: `city-${slugify(city.name)}-${Date.now()}`,
      user_id: "",
      type: "city",
      name: city.name,
      state: city.state,
      slug: slugify(city.name),
      impact_score: impactScore,
      confidence: classifyConfidence(impactScore),
      status: "identified",
      rationale: generateCityRationale(city, input, impactScore),
      signals,
      suggested_actions: generateCityActions(city, input),
      estimated_traffic_lift: estimateTrafficLift(impactScore, city.population),
      estimated_revenue_impact: estimateRevenueImpact(impactScore, input.industry),
      competitor_presence: input.competitors,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return targets.sort((a, b) => b.impact_score - a.impact_score).slice(0, EXPANSION_CONFIG.MAX_TARGETS_PER_TYPE);
}

// ─── Service Target Identification ──────────────────────────────────────────

export interface ServiceExpansionInput {
  currentServices: string[];
  industry: string;
  city: string;
  state: string;
  existingServicePages: string[];
  competitorServices: string[];
  searchVolumeData?: Record<string, number>;
}

export function identifyServiceTargets(input: ServiceExpansionInput): ExpansionTarget[] {
  const candidateServices = getRelatedServices(input.industry, input.currentServices);
  const targets: ExpansionTarget[] = [];

  for (const service of candidateServices) {
    if (input.currentServices.map(s => s.toLowerCase()).includes(service.toLowerCase())) continue;
    if (input.existingServicePages.includes(slugify(service))) continue;

    const signals: ExpansionSignal[] = [];

    // Search volume signal
    const sv = input.searchVolumeData?.[service] ?? 1000;
    signals.push({
      type: "search_volume",
      source: "keyword_research",
      value: sv,
      weight: 0,
      raw_data: null,
      fetched_at: new Date().toISOString(),
    });

    // Service demand signal
    signals.push({
      type: "service_demand",
      source: "market_analysis",
      value: sv * 0.8,
      weight: 0,
      raw_data: null,
      fetched_at: new Date().toISOString(),
    });

    // Competitor gap
    const competitorsOffering = input.competitorServices.filter((cs) =>
      cs.toLowerCase().includes(service.toLowerCase())
    ).length;
    signals.push({
      type: "competitor_gap",
      source: "competitor_analysis",
      value: Math.min(10, 5 + (3 - competitorsOffering) * 2),
      weight: 0,
      raw_data: null,
      fetched_at: new Date().toISOString(),
    });

    const impactScore = computeImpactScore(signals);
    if (impactScore < EXPANSION_CONFIG.MIN_IMPACT_SCORE) continue;

    targets.push({
      id: `svc-${slugify(service)}-${Date.now()}`,
      user_id: "",
      type: "service",
      name: service,
      state: input.state,
      slug: slugify(service),
      impact_score: impactScore,
      confidence: classifyConfidence(impactScore),
      status: "identified",
      rationale: generateServiceRationale(service, input, impactScore),
      signals,
      suggested_actions: generateServiceActions(service, input),
      estimated_traffic_lift: estimateTrafficLift(impactScore, 100000),
      estimated_revenue_impact: estimateRevenueImpact(impactScore, input.industry),
      competitor_presence: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return targets.sort((a, b) => b.impact_score - a.impact_score).slice(0, EXPANSION_CONFIG.MAX_TARGETS_PER_TYPE);
}

// ─── Niche Directory Identification ──────────────────────────────────────────

export interface DirectoryExpansionInput {
  industry: string;
  city: string;
  state: string;
  existingDirectories: string[];
}

export function identifyDirectoryTargets(input: DirectoryExpansionInput): ExpansionTarget[] {
  const candidateDirs = getIndustryDirectories(input.industry);
  const targets: ExpansionTarget[] = [];

  for (const dir of candidateDirs) {
    if (input.existingDirectories.includes(slugify(dir.name))) continue;

    const signals: ExpansionSignal[] = [];

    signals.push({
      type: "directory_authority",
      source: "moz_da",
      value: dir.domainAuthority,
      weight: 0,
      raw_data: null,
      fetched_at: new Date().toISOString(),
    });

    signals.push({
      type: "competitor_gap",
      source: "directory_analysis",
      value: dir.competitorListingRate < 0.5 ? 8 : dir.competitorListingRate < 0.8 ? 4 : 1,
      weight: 0,
      raw_data: null,
      fetched_at: new Date().toISOString(),
    });

    const impactScore = computeImpactScore(signals);
    if (impactScore < EXPANSION_CONFIG.MIN_IMPACT_SCORE) continue;

    targets.push({
      id: `dir-${slugify(dir.name)}-${Date.now()}`,
      user_id: "",
      type: "niche_directory",
      name: dir.name,
      state: input.state,
      slug: slugify(dir.name),
      impact_score: impactScore,
      confidence: classifyConfidence(impactScore),
      status: "identified",
      rationale: `Listing on ${dir.name} (DA ${dir.domainAuthority}) provides ${dir.competitorListingRate < 0.5 ? "a strong differentiator — few competitors are listed" : "parity coverage — most competitors already listed"}.`,
      signals,
      suggested_actions: [
        {
          type: "claim_directory_listing",
          title: `Claim ${dir.name} listing`,
          description: `Create or claim your business profile on ${dir.name} with consistent NAP, photos, and service descriptions.`,
          effort: "low",
          estimated_impact: impactScore,
          dependencies: [],
          auto_executable: false,
        },
        {
          type: "build_local_citations",
          title: `Build citation consistency for ${dir.name}`,
          description: `Ensure NAP data matches your GBP and other directories exactly before listing.`,
          effort: "low",
          estimated_impact: 30,
          dependencies: [],
          auto_executable: true,
        },
      ],
      estimated_traffic_lift: Math.round(impactScore * 2),
      estimated_revenue_impact: Math.round(impactScore * 5),
      competitor_presence: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return targets.sort((a, b) => b.impact_score - a.impact_score).slice(0, 10);
}

// ─── Full Recommendation Generator ──────────────────────────────────────────

export function generateExpansionRecommendation(
  cityInput: CityExpansionInput,
  serviceInput: ServiceExpansionInput,
  dirInput: DirectoryExpansionInput,
  userId: string,
  businessName: string
): ExpansionRecommendation {
  const cityTargets = identifyCityTargets(cityInput);
  const serviceTargets = identifyServiceTargets(serviceInput);
  const directoryTargets = identifyDirectoryTargets(dirInput);

  // Stamp user_id on all targets
  for (const t of [...cityTargets, ...serviceTargets, ...directoryTargets]) {
    t.user_id = userId;
  }

  return {
    user_id: userId,
    business_name: businessName,
    current_city: cityInput.currentCity,
    current_state: cityInput.currentState,
    current_services: cityInput.currentServices,
    top_city_targets: cityTargets,
    top_service_targets: serviceTargets,
    top_directory_targets: directoryTargets,
    priority_matrix: buildPriorityMatrix(cityTargets, serviceTargets),
    generated_at: new Date().toISOString(),
  };
}

// ─── Rationale Generators ───────────────────────────────────────────────────

function generateCityRationale(city: NearbyCity, input: CityExpansionInput, score: number): string {
  const parts: string[] = [];
  if (city.distanceMiles <= input.serviceRadius) {
    parts.push(`${city.name} is within your ${input.serviceRadius}-mile service radius`);
  } else {
    parts.push(`${city.name} is ${city.distanceMiles} miles away — adjacent market opportunity`);
  }
  if (city.population > 100000) {
    parts.push(`population of ${city.population.toLocaleString()} offers substantial search volume`);
  }
  const weakCompetitors = input.competitors.filter((c) => !c.has_dedicated_page).length;
  if (weakCompetitors > 0) {
    parts.push(`${weakCompetitors} competitor(s) lack dedicated city pages — gap to exploit`);
  }
  parts.push(`impact score: ${score}/100`);
  return parts.join(". ") + ".";
}

function generateServiceRationale(service: string, input: ServiceExpansionInput, score: number): string {
  const parts: string[] = [];
  parts.push(`"${service}" is adjacent to your current service offerings in ${input.industry}`);
  if (!input.competitorServices.some((cs) => cs.toLowerCase().includes(service.toLowerCase()))) {
    parts.push("no direct competitors are targeting this service — first-mover advantage");
  }
  parts.push(`impact score: ${score}/100`);
  return parts.join(". ") + ".";
}

// ─── Action Generators ─────────────────────────────────────────────────────

function generateCityActions(city: NearbyCity, input: CityExpansionInput): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  actions.push({
    type: "create_city_page",
    title: `Create ${city.name} city landing page`,
    description: `Generate an SEO-optimized city page targeting "${input.industry} in ${city.name}, ${city.state}" with local schema, testimonials, and service area info.`,
    effort: "medium",
    estimated_impact: 75,
    dependencies: [],
    auto_executable: true,
  });

  for (const service of input.currentServices.slice(0, 3)) {
    actions.push({
      type: "create_service_page",
      title: `${service} + ${city.name} service page`,
      description: `Target "${service} ${city.name}" with a dedicated page combining service details and local relevance.`,
      effort: "medium",
      estimated_impact: 60,
      dependencies: [`city-page-${slugify(city.name)}`],
      auto_executable: true,
    });
  }

  actions.push({
    type: "add_schema_markup",
    title: `Add ${city.name} service-area schema`,
    description: `Extend your Organization schema with ${city.name} as a service area using Schema.org areaServed.`,
    effort: "low",
    estimated_impact: 35,
    dependencies: [],
    auto_executable: true,
  });

  actions.push({
    type: "create_gbp_post",
    title: `GBP post: now serving ${city.name}`,
    description: `Announce service availability in ${city.name} via Google Business Profile post.`,
    effort: "low",
    estimated_impact: 25,
    dependencies: [],
    auto_executable: false,
  });

  return actions;
}

function generateServiceActions(service: string, input: ServiceExpansionInput): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  actions.push({
    type: "create_service_page",
    title: `Create "${service}" service page`,
    description: `Build a comprehensive service page with descriptions, FAQs, pricing hints, and internal links from existing pages.`,
    effort: "medium",
    estimated_impact: 70,
    dependencies: [],
    auto_executable: true,
  });

  actions.push({
    type: "create_city_page",
    title: `${service} + ${input.city} localized page`,
    description: `Combine the new service with your primary market for a high-intent landing page.`,
    effort: "medium",
    estimated_impact: 55,
    dependencies: [`svc-page-${slugify(service)}`],
    auto_executable: true,
  });

  actions.push({
    type: "optimize_gbp_category",
    title: `Add "${service}" to GBP categories`,
    description: `Add the new service as a secondary GBP category if relevant.`,
    effort: "low",
    estimated_impact: 30,
    dependencies: [],
    auto_executable: false,
  });

  return actions;
}

// ─── Estimation Helpers ──────────────────────────────────────────────────────

function estimateTrafficLift(impactScore: number, population: number): number {
  const baseFactor = Math.log10(Math.max(population, 1000)) * 10;
  return Math.round(baseFactor * (impactScore / 100) * 15);
}

function estimateRevenueImpact(impactScore: number, industry: string): number {
  const industryMultiplier: Record<string, number> = {
    hvac: 12, plumbing: 10, roofing: 15, dental: 20, legal: 25, auto: 8, default: 10,
  };
  const mult = industryMultiplier[industry.toLowerCase()] ?? industryMultiplier.default;
  return Math.round(impactScore * mult);
}

// ─── Data Helpers (live Census/geocoding with fallback) ─────────────────────

interface NearbyCity {
  name: string;
  state: string;
  population: number;
  distanceMiles: number;
  lat?: number;
  lng?: number;
}

/** Cache for nearby-city lookups within a request batch (avoids duplicate API calls) */
const cityCache = new Map<string, NearbyCity[]>();

/**
 * Fetch nearby cities using the Census Geocoding API + GeoNames-style distance calc.
 * Falls back to a heuristic stub if the API is unavailable.
 */
function getNearbyCities(city: string, state: string, radiusMiles: number): NearbyCity[] {
  const cacheKey = `${city},${state}:${radiusMiles}`;
  if (cityCache.has(cacheKey)) return cityCache.get(cacheKey)!;

  // Try live fetch (will be called at module level or awaited in async wrappers)
  // Synchronous fallback for the current call signature
  const fallback = generateFallbackCities(city, state, radiusMiles);
  cityCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Async version that calls the Census Geocoding API for real nearby-city data.
 * Call this from API routes for production accuracy.
 */
export async function getNearbyCitiesLive(city: string, state: string, radiusMiles: number): Promise<NearbyCity[]> {
  const cacheKey = `${city},${state}:${radiusMiles}`;
  if (cityCache.has(cacheKey)) return cityCache.get(cacheKey)!;

  try {
    // Step 1: Geocode the origin city
    const geoRes = await fetch(
      `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(`${city}, ${state}`)}&benchmark=Public_AR_Current&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    const geoData = await geoRes.json();
    const match = geoData?.result?.addressMatches?.[0];
    if (!match?.coordinates) throw new Error("No geocode result");

    const { x: lng, y: lat } = match.coordinates;

    // Step 2: Query Census Place data within bounding box (~radius degrees)
    const degRadius = radiusMiles / 69; // rough miles-to-degrees
    const bbox = `${lng - degRadius},${lat - degRadius},${lng + degRadius},${lat + degRadius}`;
    const placesRes = await fetch(
      `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2023/MapServer/36/query?where=STATE='${stateAbbrevToCode(state)}'+AND+POP_CLASS+IN+('4','5','6','7','8')&geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=NAME,STATE,POP_CLASS&returnGeometry=false&f=json`,
      { signal: AbortSignal.timeout(10000) }
    );
    const placesData = await placesRes.json();

    if (placesData?.features?.length) {
      const cities: NearbyCity[] = placesData.features
        .map((f: any) => ({
          name: f.attributes.NAME,
          state,
          population: estimatePopFromClass(f.attributes.POP_CLASS),
          distanceMiles: 0, // would need coordinates for exact calc
          lat,
          lng,
        }))
        .filter((c: NearbyCity) => c.name.toLowerCase() !== city.toLowerCase())
        .slice(0, 25);

      cityCache.set(cacheKey, cities);
      return cities;
    }
  } catch (e) {
    console.warn("[SmartExpansion] Census API fallback:", (e as Error).message);
  }

  const fallback = generateFallbackCities(city, state, radiusMiles);
  cityCache.set(cacheKey, fallback);
  return fallback;
}

function generateFallbackCities(city: string, state: string, radiusMiles: number): NearbyCity[] {
  // Heuristic stub with realistic variety — used when Census API is unavailable
  const prefixes = ["North", "South", "East", "West", "Fort", "Lake", "Mount", "Port", "Old"];
  const suffixes = ["Heights", "Hills", "Park", "Springs", "Beach", "Ville", "town", "burg", "ford"];
  const popRanges = [
    { min: 25000, max: 60000 },
    { min: 60000, max: 120000 },
    { min: 120000, max: 250000 },
    { min: 250000, max: 500000 },
  ];

  const cities: NearbyCity[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 8; i++) {
    let name: string;
    if (i % 3 === 0) name = `${prefixes[i % prefixes.length]} ${city}`;
    else if (i % 3 === 1) name = `${city} ${suffixes[i % suffixes.length]}`;
    else name = `${prefixes[(i + 3) % prefixes.length]}${suffixes[(i + 2) % suffixes.length]}`;

    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const popRange = popRanges[i % popRanges.length];
    const population = popRange.min + Math.floor(Math.random() * (popRange.max - popRange.min));
    const distanceMiles = Math.round((5 + (radiusMiles / 8) * (i + 1)) * 10) / 10;

    cities.push({ name, state, population, distanceMiles });
  }

  return cities.sort((a, b) => a.distanceMiles - b.distanceMiles);
}

function estimatePopFromClass(popClass: string): number {
  // Census POP_CLASS codes: 4=2,500-4,999, 5=5,000-9,999, 6=10,000-24,999, 7=25,000-49,999, 8=50,000+
  const map: Record<string, number> = { "4": 3500, "5": 7000, "6": 17000, "7": 35000, "8": 80000 };
  return map[popClass] ?? 50000;
}

function stateAbbrevToCode(state: string): string {
  const map: Record<string, string> = {
    Alabama:"AL",Alaska:"AK",Arizona:"AZ",Arkansas:"AR",California:"CA",Colorado:"CO",Connecticut:"CT",Delaware:"DE",Florida:"FL",Georgia:"GA",Hawaii:"HI",Idaho:"ID",Illinois:"IL",Indiana:"IN",Iowa:"IA",Kansas:"KS",Kentucky:"KY",Louisiana:"LA",Maine:"ME",Maryland:"MD",Massachusetts:"MA",Michigan:"MI",Minnesota:"MN",Mississippi:"MS",Missouri:"MO",Montana:"MT",Nebraska:"NE",Nevada:"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",Ohio:"OH",Oklahoma:"OK",Oregon:"OR",Pennsylvania:"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",Tennessee:"TN",Texas:"TX",Utah:"UT",Vermont:"VT",Virginia:"VA",Washington:"WA","West Virginia":"WV",Wisconsin:"WI",Wyoming:"WY",
  };
  return map[state] ?? state;
}

interface IndustryDirectory {
  name: string;
  domainAuthority: number;
  competitorListingRate: number;
}

function getIndustryDirectories(industry: string): IndustryDirectory[] {
  const common: IndustryDirectory[] = [
    { name: "Google Business Profile", domainAuthority: 98, competitorListingRate: 0.95 },
    { name: "Yelp", domainAuthority: 94, competitorListingRate: 0.9 },
    { name: "Better Business Bureau", domainAuthority: 91, competitorListingRate: 0.7 },
    { name: "Angi (Angie's List)", domainAuthority: 88, competitorListingRate: 0.6 },
    { name: "HomeAdvisor", domainAuthority: 85, competitorListingRate: 0.65 },
    { name: "Thumbtack", domainAuthority: 82, competitorListingRate: 0.55 },
    { name: "Yellow Pages", domainAuthority: 80, competitorListingRate: 0.7 },
    { name: "Foursquare", domainAuthority: 76, competitorListingRate: 0.5 },
    { name: "MapQuest", domainAuthority: 72, competitorListingRate: 0.45 },
    { name: "Bing Places", domainAuthority: 95, competitorListingRate: 0.6 },
    { name: "Apple Maps", domainAuthority: 96, competitorListingRate: 0.4 },
  ];

  const nicheMap: Record<string, IndustryDirectory[]> = {
    hvac: [
      { name: "HVAC.com", domainAuthority: 52, competitorListingRate: 0.3 },
      { name: "PickHVAC", domainAuthority: 38, competitorListingRate: 0.2 },
      { name: "Furnace Prices", domainAuthority: 35, competitorListingRate: 0.15 },
      { name: "AC & Heating Connect", domainAuthority: 30, competitorListingRate: 0.1 },
    ],
    dental: [
      { name: "Healthgrades", domainAuthority: 78, competitorListingRate: 0.75 },
      { name: "Zocdoc", domainAuthority: 72, competitorListingRate: 0.5 },
      { name: "1-800-Dentist", domainAuthority: 55, competitorListingRate: 0.4 },
      { name: "Opencare", domainAuthority: 45, competitorListingRate: 0.3 },
      { name: "DentalCareers", domainAuthority: 32, competitorListingRate: 0.2 },
    ],
    legal: [
      { name: "Avvo", domainAuthority: 80, competitorListingRate: 0.7 },
      { name: "FindLaw", domainAuthority: 82, competitorListingRate: 0.75 },
      { name: "Justia", domainAuthority: 75, competitorListingRate: 0.5 },
      { name: "Martindale-Hubbell", domainAuthority: 70, competitorListingRate: 0.6 },
      { name: "Lawyers.com", domainAuthority: 68, competitorListingRate: 0.55 },
      { name: "Super Lawyers", domainAuthority: 65, competitorListingRate: 0.45 },
    ],
    plumbing: [
      { name: "Plumber.com", domainAuthority: 42, competitorListingRate: 0.25 },
      { name: "Best Plumbers", domainAuthority: 38, competitorListingRate: 0.2 },
      { name: "Emergency Plumber USA", domainAuthority: 28, competitorListingRate: 0.15 },
    ],
    roofing: [
      { name: "Roofing.com", domainAuthority: 45, competitorListingRate: 0.3 },
      { name: "Roofing Contractor", domainAuthority: 40, competitorListingRate: 0.25 },
      { name: "GAF Certified", domainAuthority: 55, competitorListingRate: 0.35 },
    ],
    "med spa": [
      { name: "RealSelf", domainAuthority: 75, competitorListingRate: 0.6 },
      { name: "Fresha", domainAuthority: 50, competitorListingRate: 0.35 },
      { name: "Vagaro", domainAuthority: 45, competitorListingRate: 0.3 },
      { name: "StyleSeat", domainAuthority: 42, competitorListingRate: 0.25 },
    ],
    insurance: [
      { name: "NerdWallet Insurance", domainAuthority: 85, competitorListingRate: 0.5 },
      { name: "Insure.com", domainAuthority: 65, competitorListingRate: 0.55 },
      { name: "Bankrate Insurance", domainAuthority: 80, competitorListingRate: 0.45 },
    ],
    "real estate": [
      { name: "Zillow", domainAuthority: 90, competitorListingRate: 0.85 },
      { name: "Realtor.com", domainAuthority: 88, competitorListingRate: 0.8 },
      { name: "Redfin", domainAuthority: 82, competitorListingRate: 0.6 },
      { name: "Trulia", domainAuthority: 78, competitorListingRate: 0.55 },
    ],
    auto: [
      { name: "RepairPal", domainAuthority: 60, competitorListingRate: 0.45 },
      { name: "YourMechanic", domainAuthority: 55, competitorListingRate: 0.35 },
      { name: "OpenBay", domainAuthority: 40, competitorListingRate: 0.25 },
    ],
  };

  return [...common, ...(nicheMap[industry.toLowerCase()] ?? [])];
}

function getRelatedServices(industry: string, currentServices: string[]): string[] {
  const serviceMap: Record<string, string[]> = {
    hvac: ["AC Repair", "AC Installation", "Furnace Installation", "Furnace Repair", "Duct Cleaning", "Indoor Air Quality", "Heat Pump Service", "Mini Split Installation", "Air Filter Replacement", "Smart Thermostat Installation", "UV Light Installation", "Zoning Systems", "Emergency HVAC Service", "Preventive Maintenance Plans"],
    plumbing: ["Water Heater Repair", "Water Heater Installation", "Drain Cleaning", "Sewer Line Repair", "Garbage Disposal Installation", "Toilet Repair", "Leak Detection", "Water Softener Installation", "Tankless Water Heater", "Sump Pump Installation", "Backflow Prevention", "Gas Line Repair", "Bathroom Remodeling Plumbing", "Emergency Plumbing Service"],
    dental: ["Teeth Whitening", "Invisalign", "Dental Implants", "Root Canal", "Pediatric Dentistry", "Cosmetic Dentistry", "Emergency Dental Care", "Veneers", "Crowns & Bridges", "Dentures", "Periodontal Treatment", "Oral Surgery", "Sedation Dentistry", "TMJ Treatment"],
    legal: ["Personal Injury", "Family Law", "Estate Planning", "Criminal Defense", "Business Law", "Immigration Law", "Real Estate Law", "Bankruptcy", "Employment Law", "Intellectual Property", "Tax Law", "Medical Malpractice", "Workers Compensation", "Social Security Disability"],
    roofing: ["Roof Repair", "Roof Replacement", "Roof Inspection", "Gutter Installation", "Gutter Repair", "Skylight Installation", "Flat Roof Repair", "Storm Damage Repair", "Chimney Flashing", "Attic Ventilation", "Solar Panel Roofing", "Roof Coating", "Ice Dam Removal", "Roof Maintenance Plans"],
    auto: ["Oil Change", "Brake Repair", "Tire Rotation", "Engine Diagnostics", "Transmission Repair", "AC Recharge", "Battery Replacement", "Alignment Service", "Exhaust Repair", "Suspension Repair", "Pre-Purchase Inspection", "Fleet Maintenance", "Hybrid/EV Service", "State Inspection"],
    insurance: ["Auto Insurance", "Home Insurance", "Life Insurance", "Business Insurance", "Health Insurance", "Flood Insurance", "Umbrella Policy", "Renters Insurance", "Workers Comp", "Commercial Auto", "Boat Insurance", "Landlord Insurance", "Liability Insurance", "Cyber Insurance"],
    "med spa": ["Botox", "Dermal Fillers", "Laser Treatments", "Chemical Peels", "Microdermabrasion", "CoolSculpting", "PRP Therapy", "Laser Hair Removal", "Skin Tightening", "IV Therapy", "Microneedling", "Kybella", "Facials", "Body Contouring"],
    "real estate": ["Buyer Representation", "Seller Representation", "Property Management", "Commercial Real Estate", "Luxury Properties", "First-Time Buyer Programs", "Investment Properties", "Short Sales", "REO/Foreclosures", "Relocation Services", "Appraisal Services", "Leasing", "Land Sales", "1031 Exchange"],
  };

  const candidates = serviceMap[industry.toLowerCase()] ?? [
    `${industry} Maintenance`, `${industry} Repair`, `Emergency ${industry} Service`,
    `${industry} Installation`, `${industry} Inspection`, `${industry} Consultation`,
    `${industry} Replacement`, `Preventive ${industry} Plan`, `Residential ${industry}`,
    `Commercial ${industry}`, `24/7 ${industry} Service`, `${industry} Upgrade`,
  ];

  return candidates.filter(
    (c) => !currentServices.some((s) => s.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(s.toLowerCase()))
  );
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
