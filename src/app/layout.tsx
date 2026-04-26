import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { WillChatbot } from "@/components/chat/will-chatbot";
import { generateOrganizationSchema, generateWebSiteSchema, generateSoftwareAppSchema } from "@/lib/data-layer/organization-schema";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Geothority - Local Search & AI Visibility for Insurance Agents",
  description:
    "See how your business appears across local search and AI answer surfaces, then work through the highest-leverage fixes with clear guidance.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io"),
  openGraph: {
    title: "Geothority - Local Search & AI Visibility",
    description:
      "The local SEO platform that helps insurance agents measure local visibility, spot trust gaps, and prioritize the next fixes. Free website audit in 90 seconds.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io",
    siteName: "Geothority",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Geothority - Local SEO Authority Scanner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Geothority - Local Search & AI Visibility",
    description:
      "Free 90-second website audit. See your Geothority Score and get copy-paste fixes to improve local search coverage.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Geothority",
  },
  icons: {
    icon: ["/logo.svg", "/icons/icon-192x192.png"],
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    types: {
      "application/rss+xml": `${process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io"}/profiles/feed.xml`,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light-mode">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Geothority" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Theme detection before paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.classList.remove("light-mode")}}catch(e){}})()` }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateOrganizationSchema()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateWebSiteSchema()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareAppSchema()) }} />
        <QueryProvider>
          {children}
          {/* Will AI assistant - present on both public marketing pages and the app */}
          <WillChatbot />
        </QueryProvider>
      </body>
    </html>
  );
}
