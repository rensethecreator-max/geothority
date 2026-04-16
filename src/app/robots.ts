import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/scan/",
          "/content/",
          "/competitors/",
          "/settings/",
          "/billing/",
          "/onboarding/",
          "/admin/",
          "/analytics/",
          "/gbp-monitor/",
          "/schema-generator/",
          "/ai-overview/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
