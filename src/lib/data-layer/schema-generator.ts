/**
 * Schema Markup Generator
 * Generates JSON-LD structured data for public business profiles.
 * Supports LocalBusiness, WebPage, BreadcrumbList, FAQPage, AggregateRating.
 */

import type { PublicBusinessProfile, SchemaMarkupOutput } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

export function generateSchemaMarkup(profile: PublicBusinessProfile): SchemaMarkupOutput {
  const profileUrl = `${BASE_URL}/profile/${profile.slug}`;

  // LocalBusiness schema
  const business: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": determineBusinessType(profile.category),
    name: profile.businessName,
    description: profile.description,
    url: profile.url,
    ...(profile.address && {
      address: {
        "@type": "PostalAddress",
        addressLocality: profile.city,
        addressRegion: profile.state,
        streetAddress: profile.address,
      },
    }),
    ...(profile.phone && { telephone: profile.phone }),
    ...(profile.geothorityScore !== null && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: profile.geothorityScore,
        bestRating: 100,
        worstRating: 0,
        reviewCount: 1,
        itemReviewed: {
          "@type": "LocalBusiness",
          name: profile.businessName,
        },
      },
    }),
    sameAs: [profileUrl],
  };

  // WebPage schema
  const webpage: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${profile.businessName} — Geothority Profile`,
    description: `Local SEO analysis for ${profile.businessName}${profile.city ? ` in ${profile.city}, ${profile.state}` : ""}. Geothority Score: ${profile.geothorityScore ?? "N/A"}.`,
    url: profileUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "Geothority",
      url: BASE_URL,
    },
    dateModified: profile.lastScanned,
    datePublished: profile.publishedAt,
  };

  // BreadcrumbList schema
  const breadcrumb: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: BASE_URL,
      },
      ...(profile.city
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: profile.city,
              item: `${BASE_URL}/locations/${slugify(profile.city)}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: profile.city ? 3 : 2,
        name: profile.businessName,
        item: profileUrl,
      },
    ],
  };

  // FAQPage schema from quick wins
  const faqItems = (profile.quickWins ?? []).map((w) => ({
    "@type": "Question",
    name: w.title,
    acceptedAnswer: {
      "@type": "Answer",
      text: `Impact: ${w.impact} | Layer: ${w.layer}`,
    },
  }));

  const faq = faqItems.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems,
      }
    : undefined;

  // AggregateRating from geothority score
  const aggregateRating = profile.geothorityScore !== null
    ? {
        "@context": "https://schema.org",
        "@type": "AggregateRating",
        itemReviewed: { "@type": "LocalBusiness", name: profile.businessName },
        ratingValue: profile.geothorityScore,
        bestRating: 100,
        worstRating: 0,
        ratingCount: 1,
      }
    : undefined;

  return { business, webpage, breadcrumb, faq, aggregateRating };
}

function determineBusinessType(category: string | null): string {
  if (!category) return "LocalBusiness";
  const map: Record<string, string> = {
    dentist: "Dentist",
    dental: "Dentist",
    lawyer: "LegalService",
    attorney: "LegalService",
    insurance: "InsuranceAgency",
    real_estate: "RealEstateAgent",
    restaurant: "Restaurant",
    plumber: "Plumber",
    hvac: "HVACBusiness",
    auto_repair: "AutoRepair",
    chiropractor: "Chiropractor",
    gym: "HealthClub",
    salon: "BeautySalon",
  };
  const key = category.toLowerCase().replace(/[\s-]/g, "_");
  return map[key] ?? "LocalBusiness";
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
