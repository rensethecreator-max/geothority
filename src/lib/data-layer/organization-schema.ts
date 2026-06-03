/**
 * Organization & WebSite Schema
 * Site-wide structured data for Geothority's brand presence.
 * Should be included on every public page for rich search results.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Geothority",
    alternateName: "Geothority.io",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.svg`,
    description:
      "Geothority is the local SEO authority platform that scores, monitors, and improves your business visibility in Google Maps, AI overviews, and local search.",
    foundingDate: "2025",
    sameAs: [
      "https://x.com/geothority",
      "https://www.linkedin.com/company/geothority",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${BASE_URL}/support`,
      availableLanguage: "English",
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "299",
      priceCurrency: "USD",
      offerCount: 4,
    },
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Geothority",
    url: BASE_URL,
    description:
      "Local SEO scoring, competitor monitoring, and AI visibility analysis for businesses.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/profiles?city={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateSoftwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Geothority",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: BASE_URL,
    description:
      "Local SEO authority platform with automated scanning, competitor monitoring, and AI-powered insights.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free scan and basic monitoring",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
      bestRating: "5",
      worstRating: "1",
    },
  };
}
