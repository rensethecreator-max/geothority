/**
 * GET /api/public/docs
 * Public API documentation — describes available endpoints, parameters, and response shapes.
 */

import { NextResponse } from "next/server";
import { apiSuccess, withCors } from "@/lib/data-layer/api-helpers";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

export async function GET(req: Request) {
  const docs = {
    name: "Geothority Public API",
    version: "1.1.0",
    description: "Public API for accessing Geothority business profile data, schema markup, and structured feeds.",
    baseUrl: `${BASE_URL}/api/public`,
    endpoints: [
      {
        path: "/profiles",
        method: "GET",
        description: "List public business profiles with optional filtering and pagination.",
        params: {
          city: { type: "string", required: false, description: "Filter by city name" },
          state: { type: "string", required: false, description: "Filter by US state (2-letter)" },
          category: { type: "string", required: false, description: "Filter by business category" },
          min_score: { type: "number", required: false, description: "Minimum Geothority Score filter" },
          limit: { type: "number", required: false, default: 50, max: 200, description: "Results per page" },
          offset: { type: "number", required: false, default: 0, description: "Pagination offset" },
        },
        response: {
          data: "Array of profile objects",
          pagination: {
            total: "number — total matching profiles",
            offset: "number",
            limit: "number",
            hasNext: "boolean",
            nextUrl: "string | null — URL for next page",
          },
          meta: { generatedAt: "ISO 8601", cacheMaxAge: "seconds" },
        },
      },
      {
        path: "/profiles/{slug}",
        method: "GET",
        description: "Get a single business profile with full details and JSON-LD schema markup.",
        params: { slug: { type: "string", required: true, description: "Profile slug (domain-based)" } },
        response: "Full PublicBusinessProfile including schemaMarkup (LocalBusiness, WebPage, BreadcrumbList, FAQPage, AggregateRating)",
      },
      {
        path: "/docs",
        method: "GET",
        description: "This endpoint — API documentation.",
      },
    ],
    feeds: [
      { type: "rss", url: `${BASE_URL}/profiles/feed.xml`, description: "RSS 2.0 feed of latest profile publications and score updates" },
      { type: "sitemap", url: `${BASE_URL}/profiles/sitemap.xml`, description: "XML sitemap of all public business profiles" },
      { type: "sitemap", url: `${BASE_URL}/sitemap.xml`, description: "Main XML sitemap including static pages" },
      { type: "kml", url: `${BASE_URL}/profiles/geo.kml`, description: "KML geo-sitemap for geographic search engines" },
    ],
    schemaMarkup: {
      description: "All profile pages include JSON-LD structured data for LocalBusiness, WebPage, BreadcrumbList, FAQPage, and AggregateRating. The homepage includes Organization and WebSite schemas with SearchAction.",
      types: ["LocalBusiness", "WebPage", "BreadcrumbList", "FAQPage", "AggregateRating", "Organization", "WebSite", "SoftwareApplication"],
    },
    rateLimit: { requests: "Reasonable use only. Abuse, scraping, or abnormal traffic may be throttled or blocked during beta." },
    cors: { allowedOrigins: ["https://geothority.io"], methods: ["GET", "OPTIONS"] },
    links: { website: BASE_URL, signup: `${BASE_URL}/signup`, profiles: `${BASE_URL}/profiles` },
  };

  const response = apiSuccess(docs, 200, { cacheMaxAge: 3600 });
  return withCors(response, req.headers.get("origin") ?? undefined);
}

export async function OPTIONS(req: Request) {
  const response = new NextResponse(null, { status: 204 });
  return withCors(response, req.headers.get("origin") ?? undefined);
}
