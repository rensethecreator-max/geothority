import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { WillChatbot } from "@/components/chat/will-chatbot";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Geothority — Dominate Local Search & AI for Insurance Agents",
  description:
    "Discover why you're invisible in search and AI. Generate the trust signals, content, and optimizations that make you the default local answer.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io"),
  openGraph: {
    title: "Geothority — Dominate Local Search & AI",
    description:
      "The local SEO platform that shows insurance agents exactly how to become the default answer in Google and AI search. Free website audit in 90 seconds.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://geothority.io",
    siteName: "Geothority",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Geothority — Local SEO Authority Scanner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Geothority — Dominate Local Search & AI",
    description:
      "Free 90-second website audit. See your Geothority Score and get copy-paste fixes to dominate local search.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Geothority",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/apple-touch-icon.png",
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
    <html lang="en" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Geothority" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>
          {children}
          {/* Will AI assistant — present on both public marketing pages and the app */}
          <WillChatbot />
        </QueryProvider>
      </body>
    </html>
  );
}
