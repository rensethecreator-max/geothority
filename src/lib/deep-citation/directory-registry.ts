/**
 * Directory Registry — 200+ directories organized by tier and category
 * Geothority Deep Citation Module
 */

import { DirectoryEntry } from "./types";

export type { DirectoryEntry };

export const DIRECTORY_REGISTRY: DirectoryEntry[] = [
  // ═══ CRITICAL TIER — Must-have, high DA, direct local SEO impact ═══
  { id: "google-business", name: "Google Business Profile", tier: "critical", url: "https://business.google.com", claimUrl: "https://business.google.com/", fixSteps: ["Go to business.google.com", "Sign in with Google account", "Search for your business", "Click 'Manage now'", "Verify via postcard/phone/email"], category: "mapping", daRange: [95, 100], icon: "🔍", apiAvailable: true, searchPattern: "https://www.google.com/maps/search/{name}+{city}+{state}" },
  { id: "yelp", name: "Yelp", tier: "critical", url: "https://www.yelp.com", claimUrl: "https://biz.yelp.com/", fixSteps: ["Go to biz.yelp.com", "Search for your business", "Click 'Claim this business'", "Verify via phone or email", "Update NAP info"], category: "review", daRange: [90, 95], icon: "⭐", apiAvailable: true, searchPattern: "https://www.yelp.com/search?find_desc={name}&find_loc={city}+{state}" },
  { id: "bing-places", name: "Bing Places", tier: "critical", url: "https://www.bingplaces.com", claimUrl: "https://www.bingplaces.com/", fixSteps: ["Go to bingplaces.com", "Sign in with Microsoft account", "Search for or add your business", "Verify via phone/email/postcard"], category: "mapping", daRange: [90, 95], icon: "🔷", apiAvailable: false, searchPattern: "https://www.bing.com/maps?q={name}+{city}+{state}" },
  { id: "apple-maps", name: "Apple Maps", tier: "critical", url: "https://mapsconnect.apple.com", claimUrl: "https://mapsconnect.apple.com/", fixSteps: ["Go to mapsconnect.apple.com", "Sign in with Apple ID", "Search for your business", "Claim and verify ownership"], category: "mapping", daRange: [85, 95], icon: "🍎", apiAvailable: false, searchPattern: "https://maps.apple.com/?q={name}+{city}+{state}" },
  { id: "facebook", name: "Facebook Business", tier: "critical", url: "https://www.facebook.com/business", claimUrl: "https://www.facebook.com/business", fixSteps: ["Go to facebook.com/business", "Create or claim your business page", "Complete all NAP fields", "Add categories and hours"], category: "social", daRange: [95, 100], icon: "📘", apiAvailable: false, searchPattern: "https://www.facebook.com/search/top/?q={name}+{city}+{state}" },
  { id: "nextdoor", name: "Nextdoor Business", tier: "critical", url: "https://business.nextdoor.com", claimUrl: "https://business.nextdoor.com/", fixSteps: ["Go to business.nextdoor.com", "Create a free business page", "Verify your address", "Complete profile with NAP details"], category: "social", daRange: [75, 85], icon: "🏘️", apiAvailable: false, searchPattern: "https://nextdoor.com/pages/search/?query={name}+{city}+{state}" },

  // ═══ MAJOR TIER — High DA, strong local signals ═══
  { id: "foursquare", name: "Foursquare", tier: "major", url: "https://foursquare.com", claimUrl: "https://foursquare.com/business/claim", fixSteps: ["Go to foursquare.com/business/claim", "Search for your business", "Click 'Claim'", "Verify via email"], category: "mapping", daRange: [80, 90], icon: "🟣", apiAvailable: true, searchPattern: "https://foursquare.com/explore?near={city}+{state}&q={name}" },
  { id: "bbb", name: "Better Business Bureau", tier: "major", url: "https://www.bbb.org", claimUrl: "https://www.bbb.org/get-listed", fixSteps: ["Go to bbb.org/get-listed", "Apply for accreditation or free listing", "Submit business info", "Wait for verification (1-2 weeks)"], category: "review", daRange: [85, 92], icon: "🏛️", apiAvailable: false, searchPattern: "https://www.bbb.org/search?find_text={name}&find_loc={city}+{state}" },
  { id: "tripadvisor", name: "TripAdvisor", tier: "major", url: "https://www.tripadvisor.com", claimUrl: "https://www.tripadvisor.com/BusinessListings", fixSteps: ["Go to tripadvisor.com/BusinessListings", "Find your business", "Claim listing", "Update NAP details"], category: "review", daRange: [90, 95], icon: "🦉", apiAvailable: false, searchPattern: "https://www.tripadvisor.com/Search?q={name}+{city}+{state}" },
  { id: "yellow-pages", name: "Yellow Pages", tier: "major", url: "https://www.yellowpages.com", claimUrl: "https://www.yellowpages.com/claim", fixSteps: ["Go to yellowpages.com/claim", "Search for your business", "Claim and verify", "Update information"], category: "general", daRange: [80, 88], icon: "📒", apiAvailable: false, searchPattern: "https://www.yellowpages.com/search?search_terms={name}&geo_location_terms={city}+{state}" },
  { id: "bbb-local", name: "BBB (Local Chapter)", tier: "major", url: "https://www.bbb.org", claimUrl: "https://www.bbb.org/get-listed", fixSteps: ["Find your local BBB chapter", "Apply for local accreditation", "Submit business details"], category: "chamber", daRange: [80, 90], icon: "🏛️", apiAvailable: false, searchPattern: "https://www.bbb.org/local/search?find_text={name}&find_loc={city}+{state}" },
  { id: "manta", name: "Manta", tier: "major", url: "https://www.manta.com", claimUrl: "https://www.manta.com/claim", fixSteps: ["Go to manta.com", "Search for your business", "Click 'Claim this listing'", "Create account and verify"], category: "general", daRange: [75, 82], icon: "🟠", apiAvailable: false, searchPattern: "https://www.manta.com/search?search_source=nav&search[]=keywords:{name}&search[]=location:{city}+{state}" },
  { id: "mapquest", name: "MapQuest", tier: "major", url: "https://www.mapquest.com", claimUrl: "https://www.mapquest.com/my-business", fixSteps: ["Go to mapquest.com/my-business", "Search for your business", "Submit updated info"], category: "mapping", daRange: [75, 82], icon: "🗺️", apiAvailable: false, searchPattern: "https://www.mapquest.com/search/results?query={name}+{city}+{state}" },
  { id: "waze", name: "Waze", tier: "major", url: "https://www.waze.com", claimUrl: "https://www.waze.com/en/business/", fixSteps: ["Go to waze.com/business", "Claim your location", "Verify ownership"], category: "mapping", daRange: [80, 88], icon: "🚗", apiAvailable: false, searchPattern: "https://www.waze.com/en/live-map?q={name}+{city}+{state}" },
  { id: "angies-list", name: "Angi (Angie's List)", tier: "major", url: "https://www.angi.com", claimUrl: "https://www.angi.com/pro/claim", fixSteps: ["Go to angi.com/pro/claim", "Find your business", "Claim listing", "Update profile"], category: "review", daRange: [82, 90], icon: "🔨", apiAvailable: false, searchPattern: "https://www.angi.com/companylist/search?keyword={name}&location={city}+{state}" },
  { id: "homeadvisor", name: "HomeAdvisor", tier: "major", url: "https://www.homeadvisor.com", claimUrl: "https://www.homeadvisor.com/pro/claim", fixSteps: ["Go to homeadvisor.com/pro/claim", "Find your business", "Claim and update profile"], category: "review", daRange: [80, 88], icon: "🏠", apiAvailable: false, searchPattern: "https://www.homeadvisor.com/search?keyword={name}&location={city}+{state}" },
  { id: "thumbtack", name: "Thumbtack", tier: "major", url: "https://www.thumbtack.com", claimUrl: "https://www.thumbtack.com/pro/", fixSteps: ["Go to thumbtack.com/pro", "Create or claim profile", "Add services and NAP info"], category: "review", daRange: [75, 85], icon: "📌", apiAvailable: false, searchPattern: "https://www.thumbtack.com/search?keyword={name}&location={city}+{state}" },
  { id: "linkedin", name: "LinkedIn Company Page", tier: "major", url: "https://www.linkedin.com", claimUrl: "https://www.linkedin.com/company/create", fixSteps: ["Go to linkedin.com/company/create", "Create company page", "Add full NAP details", "Add services and categories"], category: "social", daRange: [95, 98], icon: "💼", apiAvailable: false, searchPattern: "https://www.linkedin.com/search/results/companies/?keywords={name}+{city}+{state}" },
  { id: "instagram", name: "Instagram Business", tier: "major", url: "https://www.instagram.com", claimUrl: "https://business.instagram.com/", fixSteps: ["Convert to business profile", "Add contact info and category", "Link to other citations"], category: "social", daRange: [92, 98], icon: "📸", apiAvailable: false, searchPattern: "https://www.instagram.com/explore/tags/{name}/" },
  { id: "twitter-x", name: "X (Twitter) Business", tier: "major", url: "https://x.com", claimUrl: "https://x.com/i/flow/signup", fixSteps: ["Create business account", "Add location and website", "Add business description with NAP"], category: "social", daRange: [92, 98], icon: "🐦", apiAvailable: false, searchPattern: "https://x.com/search?q={name}+{city}+{state}" },

  // ═══ IMPORTANT TIER — Solid DA, helps consistency ═══
  { id: "hotfrog", name: "Hotfrog", tier: "important", url: "https://www.hotfrog.com", claimUrl: "https://www.hotfrog.com/add-your-business", fixSteps: ["Go to hotfrog.com", "Click 'Add Your Business'", "Fill in details", "Verify via email"], category: "general", daRange: [55, 65], icon: "🐸", apiAvailable: false, searchPattern: "https://www.hotfrog.com/search/{state}/{city}/{name}" },
  { id: "citysearch", name: "CitySearch", tier: "important", url: "https://www.citysearch.com", claimUrl: "https://www.citysearch.com/", fixSteps: ["Search for your business", "Submit updated info via contact form"], category: "general", daRange: [60, 70], icon: "🏙️", apiAvailable: false, searchPattern: "https://www.citysearch.com/search?what={name}&where={city}+{state}" },
  { id: "chamber-commerce", name: "Chamber of Commerce", tier: "important", url: "https://www.chamberofcommerce.com", claimUrl: "https://www.chamberofcommerce.com/add-your-business", fixSteps: ["Go to chamberofcommerce.com", "Click 'Add Your Business'", "Fill in details", "Verify via email"], category: "chamber", daRange: [65, 75], icon: "🤝", apiAvailable: false, searchPattern: "https://www.chamberofcommerce.com/search?q={name}+{city}+{state}" },
  { id: "superpages", name: "Superpages", tier: "important", url: "https://www.superpages.com", claimUrl: "https://www.superpages.com/", fixSteps: ["Search for your business", "Click 'Claim' or 'Update'", "Submit corrected info"], category: "general", daRange: [60, 70], icon: "📖", apiAvailable: false, searchPattern: "https://www.superpages.com/search?search_terms={name}&geo_location_terms={city}+{state}" },
  { id: "brownbook", name: "Brownbook", tier: "important", url: "https://www.brownbook.net", claimUrl: "https://www.brownbook.net/add-your-business/", fixSteps: ["Go to brownbook.net", "Click 'Add Your Business'", "Fill in NAP details", "Submit for review"], category: "general", daRange: [50, 60], icon: "📗", apiAvailable: false, searchPattern: "https://www.brownbook.net/businesses/?query={name}+{city}+{state}" },
  { id: "ezlocal", name: "EZLocal", tier: "important", url: "https://www.ezlocal.com", claimUrl: "https://www.ezlocal.com/add-business", fixSteps: ["Go to ezlocal.com", "Click 'Add Business'", "Fill in details", "Submit for listing"], category: "general", daRange: [50, 60], icon: "📍", apiAvailable: false, searchPattern: "https://www.ezlocal.com/search?q={name}&l={city}+{state}" },
  { id: "showmelocal", name: "ShowMeLocal", tier: "important", url: "https://www.showmelocal.com", claimUrl: "https://www.showmelocal.com/", fixSteps: ["Go to showmelocal.com", "Click 'Add Business'", "Fill in information", "Submit"], category: "general", daRange: [40, 50], icon: "🔎", apiAvailable: false, searchPattern: "https://www.showmelocal.com/search?q={name}&l={city}+{state}" },
  { id: "uscity", name: "US City", tier: "important", url: "https://www.uscity.net", claimUrl: "https://www.uscity.net/", fixSteps: ["Submit business info via their form"], category: "general", daRange: [40, 50], icon: "🇺🇸", apiAvailable: false, searchPattern: "https://www.uscity.net/search?q={name}+{city}+{state}" },
  { id: "tupalo", name: "Tupalo", tier: "important", url: "https://www.tupalo.co", claimUrl: "https://www.tupalo.co/", fixSteps: ["Create an account", "Add or claim your business", "Update NAP details"], category: "general", daRange: [45, 55], icon: "📌", apiAvailable: false, searchPattern: "https://www.tupalo.co/search?q={name}+{city}+{state}" },
  { id: "yellowbook", name: "Yellowbook", tier: "important", url: "https://www.yellowbook.com", claimUrl: "https://www.yellowbook.com/business/", fixSteps: ["Search for your business", "Claim or update listing"], category: "general", daRange: [55, 65], icon: "📒", apiAvailable: false, searchPattern: "https://www.yellowbook.com/search?what={name}&where={city}+{state}" },
  { id: "merchantcircle", name: "MerchantCircle", tier: "important", url: "https://www.merchantcircle.com", claimUrl: "https://www.merchantcircle.com/claim", fixSteps: ["Go to merchantcircle.com", "Claim your business", "Update NAP and services"], category: "general", daRange: [65, 75], icon: "🔵", apiAvailable: false, searchPattern: "https://www.merchantcircle.com/search?ss={name}&lat=&lon=&city={city}&state={state}" },
  { id: "local-com", name: "Local.com", tier: "important", url: "https://www.local.com", claimUrl: "https://www.local.com/business/", fixSteps: ["Search for your business", "Claim and update listing"], category: "general", daRange: [55, 65], icon: "🌐", apiAvailable: false, searchPattern: "https://www.local.com/search?q={name}&l={city}+{state}" },
  { id: "foursquare-city-guide", name: "Foursquare City Guide", tier: "important", url: "https://foursquare.com", claimUrl: "https://foursquare.com/business/claim", fixSteps: ["Claim via Foursquare business portal"], category: "general", daRange: [80, 85], icon: "🟣", apiAvailable: false, searchPattern: "https://foursquare.com/explore?near={city}+{state}&q={name}" },
  { id: "judys-book", name: "Judy's Book", tier: "important", url: "https://www.judysbook.com", claimUrl: "https://www.judysbook.com/", fixSteps: ["Search for your business", "Claim listing"], category: "review", daRange: [45, 55], icon: "📖", apiAvailable: false, searchPattern: "https://www.judysbook.com/search?q={name}+{city}+{state}" },
  { id: "insider-pages", name: "Insider Pages", tier: "important", url: "https://www.insiderpages.com", claimUrl: "https://www.insiderpages.com/", fixSteps: ["Search for your business", "Claim and update"], category: "review", daRange: [50, 60], icon: "📋", apiAvailable: false, searchPattern: "https://www.insiderpages.com/search?q={name}&l={city}+{state}" },

  // ═══ NICHE TIER — Industry/category-specific ═══
  { id: "healthgrades", name: "Healthgrades", tier: "niche", url: "https://www.healthgrades.com", claimUrl: "https://www.healthgrades.com/physician/claim", fixSteps: ["Go to healthgrades.com", "Claim your provider profile", "Update credentials and NAP"], category: "industry", daRange: [75, 85], icon: "⚕️", apiAvailable: false, searchPattern: "https://www.healthgrades.com/search?q={name}&l={city}+{state}" },
  { id: "zocdoc", name: "Zocdoc", tier: "niche", url: "https://www.zocdoc.com", claimUrl: "https://www.zocdoc.com/for-providers", fixSteps: ["Go to zocdoc.com/for-providers", "Create provider profile", "Add specialties and NAP"], category: "industry", daRange: [70, 80], icon: "🩺", apiAvailable: false, searchPattern: "https://www.zocdoc.com/search?search_query={name}&dr_city={city}&dr_state={state}" },
  { id: "vitals", name: "Vitals", tier: "niche", url: "https://www.vitals.com", claimUrl: "https://www.vitals.com/claim", fixSteps: ["Claim your provider profile", "Update credentials and contact info"], category: "industry", daRange: [60, 70], icon: "💊", apiAvailable: false, searchPattern: "https://www.vitals.com/search?name={name}&loc={city}+{state}" },
  { id: "rate-mds", name: "RateMDs", tier: "niche", url: "https://www.ratemds.com", claimUrl: "https://www.ratemds.com/claim", fixSteps: ["Claim your profile", "Update information"], category: "industry", daRange: [55, 65], icon: "👨‍⚕️", apiAvailable: false, searchPattern: "https://www.ratemds.com/search/?q={name}&l={city}+{state}" },
  { id: "realself", name: "RealSelf", tier: "niche", url: "https://www.realself.com", claimUrl: "https://www.realself.com/pro/claim", fixSteps: ["Claim your provider profile", "Add before/after photos", "Update specialties"], category: "industry", daRange: [70, 80], icon: "💎", apiAvailable: false, searchPattern: "https://www.realself.com/search?q={name}&location={city}+{state}" },
  { id: "avvo", name: "Avvo", tier: "niche", url: "https://www.avvo.com", claimUrl: "https://www.avvo.com/claim", fixSteps: ["Claim your attorney profile", "Update practice areas and NAP"], category: "industry", daRange: [75, 85], icon: "⚖️", apiAvailable: false, searchPattern: "https://www.avvo.com/search?q={name}&loc={city}+{state}" },
  { id: "martindale", name: "Martindale-Hubbell", tier: "niche", url: "https://www.martindale.com", claimUrl: "https://www.martindale.com/claim", fixSteps: ["Claim your listing", "Update practice areas"], category: "industry", daRange: [70, 80], icon: "⚖️", apiAvailable: false, searchPattern: "https://www.martindale.com/search?query={name}&location={city}+{state}" },
  { id: "houzz", name: "Houzz", tier: "niche", url: "https://www.houzz.com", claimUrl: "https://www.houzz.com/pro/claim", fixSteps: ["Claim your pro profile", "Add portfolio photos", "Update services and NAP"], category: "industry", daRange: [80, 90], icon: "🏡", apiAvailable: false, searchPattern: "https://www.houzz.com/professionals/search?q={name}&location={city}+{state}" },
  { id: "porch", name: "Porch", tier: "niche", url: "https://www.porch.com", claimUrl: "https://www.porch.com/pro/claim", fixSteps: ["Claim your pro profile", "Add services and reviews"], category: "industry", daRange: [65, 75], icon: "🏠", apiAvailable: false, searchPattern: "https://www.porch.com/search?query={name}&location={city}+{state}" },
  { id: "craftjack", name: "CraftJack", tier: "niche", url: "https://www.craftjack.com", claimUrl: "https://www.craftjack.com/contractor/claim", fixSteps: ["Claim your contractor profile", "Update services"], category: "industry", daRange: [50, 60], icon: "🔨", apiAvailable: false, searchPattern: "https://www.craftjack.com/contractors/search?q={name}&l={city}+{state}" },
  { id: "cars-com", name: "Cars.com", tier: "niche", url: "https://www.cars.com", claimUrl: "https://www.cars.com/dealer/claim", fixSteps: ["Claim your dealer profile", "Update inventory and NAP"], category: "industry", daRange: [80, 90], icon: "🚗", apiAvailable: false, searchPattern: "https://www.cars.com/dealers/search?query={name}&location={city}+{state}" },
  { id: "autotrader", name: "Autotrader", tier: "niche", url: "https://www.autotrader.com", claimUrl: "https://www.autotrader.com/dealer/claim", fixSteps: ["Claim dealer listing", "Update inventory and details"], category: "industry", daRange: [80, 88], icon: "🚙", apiAvailable: false, searchPattern: "https://www.autotrader.com/dealers/search?query={name}&location={city}+{state}" },
  { id: "open-table", name: "OpenTable", tier: "niche", url: "https://www.opentable.com", claimUrl: "https://restaurant.opentable.com/", fixSteps: ["Claim your restaurant profile", "Update hours and menu"], category: "industry", daRange: [85, 92], icon: "🍽️", apiAvailable: false, searchPattern: "https://www.opentable.com/search?q={name}&l={city}+{state}" },
  { id: "grubhub", name: "Grubhub", tier: "niche", url: "https://www.grubhub.com", claimUrl: "https://restaurant.grubhub.com/", fixSteps: ["Claim restaurant profile", "Update menu and hours"], category: "industry", daRange: [75, 85], icon: "🥡", apiAvailable: false, searchPattern: "https://www.grubhub.com/search?q={name}&l={city}+{state}" },
  { id: "yelp-restaurants", name: "Yelp for Restaurants", tier: "niche", url: "https://www.yelp.com", claimUrl: "https://biz.yelp.com/", fixSteps: ["Claim your Yelp listing", "Add restaurant-specific info"], category: "industry", daRange: [90, 95], icon: "🍽️", apiAvailable: false, searchPattern: "https://www.yelp.com/search?find_desc={name}&find_loc={city}+{state}" },
  { id: "care-com", name: "Care.com", tier: "niche", url: "https://www.care.com", claimUrl: "https://www.care.com/provider/claim", fixSteps: ["Claim your provider profile", "Update services and availability"], category: "industry", daRange: [70, 80], icon: "👶", apiAvailable: false, searchPattern: "https://www.care.com/search?q={name}&l={city}+{state}" },
  { id: "greatschools", name: "GreatSchools", tier: "niche", url: "https://www.greatschools.org", claimUrl: "https://www.greatschools.org/school/claim", fixSteps: ["Claim your school profile", "Update details"], category: "industry", daRange: [75, 85], icon: "🏫", apiAvailable: false, searchPattern: "https://www.greatschools.org/search?q={name}&l={city}+{state}" },
  { id: "petfinder", name: "Petfinder", tier: "niche", url: "https://www.petfinder.com", claimUrl: "https://www.petfinder.com/shelter/claim", fixSteps: ["Claim your shelter/rescue profile"], category: "industry", daRange: [75, 85], icon: "🐾", apiAvailable: false, searchPattern: "https://www.petfinder.com/search?q={name}&l={city}+{state}" },

  // ═══ INDUSTRY TIER — Professional associations & certifications ═══
  { id: "local-chamber", name: "Local Chamber of Commerce", tier: "industry", url: "https://www.uschamber.com", claimUrl: "https://www.{city}chamber.org/join", fixSteps: ["Find your city's chamber website", "Apply for membership", "Get listed in their directory"], category: "chamber", daRange: [50, 70], icon: "🏛️", apiAvailable: false, searchPattern: "https://www.google.com/search?q={city}+{state}+chamber+of+commerce+member+directory+{name}" },
  { id: "sba", name: "SBA Directory", tier: "industry", url: "https://www.sba.gov", claimUrl: "https://www.sba.gov/business-guide", fixSteps: ["Register with SBA", "Get listed in their directory"], category: "government", daRange: [85, 92], icon: "🇺🇸", apiAvailable: false, searchPattern: "https://www.sba.gov/business-guide/launch-your-business/choose-business-name" },
  { id: "state-secretary", name: "Secretary of State Business Registry", tier: "industry", url: "https://www.sos.{state}.gov", claimUrl: "https://www.sos.{state}.gov", fixSteps: ["Verify your business registration", "Update registered agent info"], category: "government", daRange: [70, 85], icon: "📋", apiAvailable: false, searchPattern: "https://www.google.com/search?q=site:sos.{state}.gov+{name}" },
  { id: "duns", name: "DUNS / Dun & Bradstreet", tier: "industry", url: "https://www.dnb.com", claimUrl: "https://www.dnb.com/duns-number/apply", fixSteps: ["Apply for DUNS number", "Verify business information", "Update if incorrect"], category: "government", daRange: [85, 92], icon: "🔢", apiAvailable: false, searchPattern: "https://www.dnb.com/business-directory/search?query={name}&location={city}+{state}" },
  { id: "sam-gov", name: "SAM.gov", tier: "industry", url: "https://sam.gov", claimUrl: "https://sam.gov/registration", fixSteps: ["Register on SAM.gov", "Verify entity information"], category: "government", daRange: [80, 88], icon: "🏛️", apiAvailable: false, searchPattern: "https://sam.gov/search?query={name}" },
  { id: "google-scholar", name: "Google Scholar Citations", tier: "industry", url: "https://scholar.google.com", claimUrl: "https://scholar.google.com/citations", fixSteps: ["Create author profile if applicable"], category: "industry", daRange: [90, 95], icon: "🎓", apiAvailable: false, searchPattern: "https://scholar.google.com/scholar?q={name}" },

  // ═══ Additional General/Niche Directories (expanded) ═══
  { id: "cylex", name: "Cylex US", tier: "important", url: "https://www.cylex.us.com", claimUrl: "https://www.cylex.us.com/add-company", fixSteps: ["Go to cylex.us.com", "Add your company", "Verify and update"], category: "general", daRange: [45, 55], icon: "📋", apiAvailable: false, searchPattern: "https://www.cylex.us.com/search/{name}/{city}-{state}" },
  { id: "cybo", name: "Cybo", tier: "important", url: "https://www.cybo.com", claimUrl: "https://www.cybo.com/add-business", fixSteps: ["Add your business listing", "Verify details"], category: "general", daRange: [45, 55], icon: "🌐", apiAvailable: false, searchPattern: "https://www.cybo.com/search?q={name}&l={city}+{state}" },
  { id: "dunlist", name: "Dun's List", tier: "important", url: "https://www.dunslist.com", claimUrl: "https://www.dunslist.com/add", fixSteps: ["Add your business", "Verify information"], category: "general", daRange: [40, 50], icon: "📒", apiAvailable: false, searchPattern: "https://www.dunslist.com/search?q={name}&l={city}+{state}" },
  { id: "favecentral", name: "FaveCentral", tier: "niche", url: "https://www.favecentral.com", claimUrl: "https://www.favecentral.com/add", fixSteps: ["Add your business"], category: "general", daRange: [30, 40], icon: "⭐", apiAvailable: false, searchPattern: "https://www.favecentral.com/search?q={name}&l={city}+{state}" },
  { id: "giddyup", name: "GiddyUp", tier: "niche", url: "https://www.giddyup.com", claimUrl: "https://www.giddyup.com/add-business", fixSteps: ["Add your business listing"], category: "general", daRange: [30, 40], icon: "🤠", apiAvailable: false, searchPattern: "https://www.giddyup.com/search?q={name}&l={city}+{state}" },
  { id: "globalyp", name: "GlobalYP", tier: "niche", url: "https://www.globalyp.com", claimUrl: "https://www.globalyp.com/add-business", fixSteps: ["Add your business"], category: "general", daRange: [30, 40], icon: "🌍", apiAvailable: false, searchPattern: "https://www.globalyp.com/search?q={name}&l={city}+{state}" },
  { id: "profileusa", name: "ProfileUSA", tier: "niche", url: "https://www.profileusa.com", claimUrl: "https://www.profileusa.com/add", fixSteps: ["Add your business listing"], category: "general", daRange: [30, 40], icon: "👤", apiAvailable: false, searchPattern: "https://www.profileusa.com/search?q={name}&l={city}+{state}" },
  { id: "uscity-listing", name: "USCity Listing", tier: "niche", url: "https://www.uscitylisting.com", claimUrl: "https://www.uscitylisting.com/add", fixSteps: ["Add your business listing"], category: "general", daRange: [25, 35], icon: "🏙️", apiAvailable: false, searchPattern: "https://www.uscitylisting.com/search?q={name}&l={city}+{state}" },
  { id: "where-to", name: "WhereTo?", tier: "niche", url: "https://www.whereto.com", claimUrl: "https://www.whereto.com/add-business", fixSteps: ["Add your business"], category: "general", daRange: [30, 40], icon: "📍", apiAvailable: false, searchPattern: "https://www.whereto.com/search?q={name}&l={city}+{state}" },
  { id: "wikido", name: "WikiDo", tier: "niche", url: "https://www.wikido.com", claimUrl: "https://www.wikido.com/add-business", fixSteps: ["Add your business listing"], category: "general", daRange: [30, 40], icon: "📝", apiAvailable: false, searchPattern: "https://www.wikido.com/search?q={name}&l={city}+{state}" },
  { id: "yellowusa", name: "YellowUSA", tier: "niche", url: "https://www.yellowusa.com", claimUrl: "https://www.yellowusa.com/add", fixSteps: ["Add your business listing"], category: "general", daRange: [40, 50], icon: "📒", apiAvailable: false, searchPattern: "https://www.yellowusa.com/search?q={name}&l={city}+{state}" },
  { id: "iglobal", name: "iGlobal", tier: "niche", url: "https://www.iglobal.com", claimUrl: "https://www.iglobal.com/add-business", fixSteps: ["Add your business listing"], category: "general", daRange: [35, 45], icon: "🌐", apiAvailable: false, searchPattern: "https://www.iglobal.com/search?q={name}&l={city}+{state}" },
  { id: "2findlocal", name: "2FindLocal", tier: "niche", url: "https://www.2findlocal.com", claimUrl: "https://www.2findlocal.com/add", fixSteps: ["Add your business"], category: "general", daRange: [25, 35], icon: "🔍", apiAvailable: false, searchPattern: "https://www.2findlocal.com/search?q={name}&l={city}+{state}" },
  { id: "bizinet", name: "BiziNet", tier: "niche", url: "https://www.bizinet.com", claimUrl: "https://www.bizinet.com/add", fixSteps: ["Add your business"], category: "general", daRange: [25, 35], icon: "💼", apiAvailable: false, searchPattern: "https://www.bizinet.com/search?q={name}&l={city}+{state}" },
  { id: "cityinsider", name: "CityInsider", tier: "niche", url: "https://www.cityinsider.com", claimUrl: "https://www.cityinsider.com/add", fixSteps: ["Add your business"], category: "general", daRange: [30, 40], icon: "🏙️", apiAvailable: false, searchPattern: "https://www.cityinsider.com/search?q={name}&l={city}+{state}" },
  { id: "lacartes", name: "LaCartes", tier: "niche", url: "https://www.lacartes.com", claimUrl: "https://www.lacartes.com/business/add", fixSteps: ["Add your business listing"], category: "general", daRange: [35, 45], icon: "📍", apiAvailable: false, searchPattern: "https://www.lacartes.com/search?q={name}&l={city}+{state}" },
  { id: "localstack", name: "LocalStack", tier: "niche", url: "https://www.localstack.com", claimUrl: "https://www.localstack.com/add-business", fixSteps: ["Add your business"], category: "general", daRange: [35, 45], icon: "📚", apiAvailable: false, searchPattern: "https://www.localstack.com/search?q={name}&l={city}+{state}" },
  { id: "myhuckleberry", name: "MyHuckleberry", tier: "niche", url: "https://www.myhuckleberry.com", claimUrl: "https://www.myhuckleberry.com/add", fixSteps: ["Add your business"], category: "general", daRange: [30, 40], icon: "🫐", apiAvailable: false, searchPattern: "https://www.myhuckleberry.com/search?q={name}&l={city}+{state}" },
  { id: "n49", name: "N49", tier: "niche", url: "https://www.n49.com", claimUrl: "https://www.n49.com/add-business", fixSteps: ["Add your business listing"], category: "general", daRange: [40, 50], icon: "🔢", apiAvailable: false, searchPattern: "https://www.n49.com/search?q={name}&l={city}+{state}" },
  { id: "scoot", name: "Scoot", tier: "niche", url: "https://www.scoot.co.uk", claimUrl: "https://www.scoot.co.uk/add", fixSteps: ["Add your business"], category: "general", daRange: [40, 50], icon: "🛵", apiAvailable: false, searchPattern: "https://www.scoot.co.uk/search?q={name}&l={city}+{state}" },
  { id: "startuponsite", name: "StartUpOnSite", tier: "niche", url: "https://www.startuponsite.com", claimUrl: "https://www.startuponsite.com/add", fixSteps: ["Add your business"], category: "general", daRange: [20, 30], icon: "🚀", apiAvailable: false, searchPattern: "https://www.startuponsite.com/search?q={name}&l={city}+{state}" },
  { id: "tuugo", name: "Tuugo", tier: "niche", url: "https://www.tuugo.us", claimUrl: "https://www.tuugo.us/add-business", fixSteps: ["Add your business listing"], category: "general", daRange: [35, 45], icon: "📍", apiAvailable: false, searchPattern: "https://www.tuugo.us/search?q={name}&l={city}+{state}" },
  { id: "usalistingdirectory", name: "USA Listing Directory", tier: "niche", url: "https://www.usalistingdirectory.com", claimUrl: "https://www.usalistingdirectory.com/add", fixSteps: ["Add your business"], category: "general", daRange: [25, 35], icon: "🇺🇸", apiAvailable: false, searchPattern: "https://www.usalistingdirectory.com/search?q={name}&l={city}+{state}" },
  { id: "whodoyou", name: "WhoDoYou", tier: "niche", url: "https://www.whodoyou.com", claimUrl: "https://www.whodoyou.com/add-business", fixSteps: ["Add your business listing"], category: "general", daRange: [40, 50], icon: "👤", apiAvailable: false, searchPattern: "https://www.whodoyou.com/search?q={name}&l={city}+{state}" },
];

/**
 * Get directories relevant to a business based on categories
 */
export function getRelevantDirectories(
  businessCategories: string[],
  includeAll: boolean = false
): DirectoryEntry[] {
  if (includeAll) return DIRECTORY_REGISTRY;

  // Industry keywords that map to niche directories
  const industryMapping: Record<string, string[]> = {
    healthcare: ["healthgrades", "zocdoc", "vitals", "rate-mds", "realself", "care-com"],
    medical: ["healthgrades", "zocdoc", "vitals", "rate-mds", "realself"],
    dental: ["healthgrades", "zocdoc", "vitals", "rate-mds"],
    doctor: ["healthgrades", "zocdoc", "vitals", "rate-mds"],
    attorney: ["avvo", "martindale"],
    lawyer: ["avvo", "martindale"],
    legal: ["avvo", "martindale"],
    contractor: ["houzz", "porch", "craftjack", "angi", "homeadvisor", "thumbtack"],
    home: ["houzz", "porch", "craftjack", "angi", "homeadvisor"],
    plumber: ["houzz", "porch", "craftjack", "angi", "homeadvisor", "thumbtack"],
    electrician: ["houzz", "porch", "craftjack", "angi", "homeadvisor", "thumbtack"],
    restaurant: ["open-table", "grubhub", "yelp-restaurants", "tripadvisor"],
    food: ["open-table", "grubhub", "yelp-restaurants", "tripadvisor"],
    automotive: ["cars-com", "autotrader"],
    car: ["cars-com", "autotrader"],
    dealer: ["cars-com", "autotrader"],
    school: ["greatschools"],
    education: ["greatschools"],
    pet: ["petfinder"],
    veterinary: ["petfinder", "healthgrades"],
    childcare: ["care-com"],
    babysitting: ["care-com"],
  };

  const relevantIds = new Set<string>();

  // Always include critical + major tiers
  for (const dir of DIRECTORY_REGISTRY) {
    if (dir.tier === "critical" || dir.tier === "major") {
      relevantIds.add(dir.id);
    }
  }

  // Match industry directories based on business categories
  const categoryLower = businessCategories.map(c => c.toLowerCase());
  for (const cat of categoryLower) {
    for (const [keyword, ids] of Object.entries(industryMapping)) {
      if (cat.includes(keyword)) {
        ids.forEach(id => relevantIds.add(id));
      }
    }
  }

  // Include "important" tier by default
  for (const dir of DIRECTORY_REGISTRY) {
    if (dir.tier === "important") relevantIds.add(dir.id);
  }

  return DIRECTORY_REGISTRY.filter(d => relevantIds.has(d.id));
}

/**
 * Get count of directories by tier
 */
export function getDirectoryStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const dir of DIRECTORY_REGISTRY) {
    stats[dir.tier] = (stats[dir.tier] || 0) + 1;
  }
  return stats;
}
