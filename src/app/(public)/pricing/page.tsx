"use client";

import { PublicHeader } from "@/components/layout/public-header";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export default function PricingPage() {
  const [billingAnnual, setBillingAnnual] = useState(false);

  const getPrice = (monthlyPrice: number) => {
    return billingAnnual ? Math.floor(monthlyPrice * 12 * 0.83) : monthlyPrice;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <PublicHeader />

      <section className="py-20 px-4 text-center">
        <h1 className="text-4xl font-bold mb-8">
          Choose the plan that&apos;s right for you
        </h1>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 bg-gray-800 rounded-full p-1 mb-10">
          <button
            onClick={() => setBillingAnnual(false)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              !billingAnnual
                ? "bg-electric-500 text-white shadow-lg shadow-electric-500/25"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingAnnual(true)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              billingAnnual
                ? "bg-electric-500 text-white shadow-lg shadow-electric-500/25"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Annual (17% off)
          </button>
        </div>

        {/* Pricing tiers */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Audit Only */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold">Audit Only</h2>
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 font-semibold">One-Time</span>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              A complete one-time scan with full Trust Stack&#8482; report and Quick Win cards. No subscription required.
            </p>
            <div className="text-4xl font-bold mb-4">
              $47
            </div>
            <Link
              href="/login"
              className="bg-electric-500 hover:bg-electric-400 text-white font-bold py-2 px-4 rounded-full block mb-4 text-center"
            >
              Get Audit
            </Link>
          </div>

          {/* Starter (was first) */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Starter</h2>
            <p className="text-gray-400 mb-4">
              GBP health audit, local authority score, citation scan, 1 location,
              email support
            </p>
            <div className="text-4xl font-bold mb-4">
              ${getPrice(97)}
              <span className="text-sm text-gray-400">
                {billingAnnual ? "/yr" : "/mo"}
              </span>
            </div>
            <Link
              href="/login"
              className="bg-electric-500 hover:bg-electric-400 text-white font-bold py-2 px-4 rounded-full block mb-4"
            >
              Get Started
            </Link>
          </div>

          {/* Growth */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Growth (MOST POPULAR)</h2>
            <p className="text-gray-400 mb-4">
              Everything in Starter + weekly AI GBP posts, automated review
              requests, competitor tracking (3), citation sync 80+ directories,
              priority support
            </p>
            <div className="text-4xl font-bold mb-4">
              ${getPrice(197)}
              <span className="text-sm text-gray-400">
                {billingAnnual ? "/yr" : "/mo"}
              </span>
            </div>
            <Link
              href="/login"
              className="bg-electric-500 hover:bg-electric-400 text-white font-bold py-2 px-4 rounded-full block mb-4"
            >
              Get Started
            </Link>
          </div>

          {/* Authority */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Authority</h2>
            <p className="text-gray-400 mb-4">
              Everything in Growth + full trust stack dashboard, AI content
              engine, unlimited competitors, white-label PDF reports, dedicated
              onboarding call
            </p>
            <div className="text-4xl font-bold mb-4">
              ${getPrice(297)}
              <span className="text-sm text-gray-400">
                {billingAnnual ? "/yr" : "/mo"}
              </span>
            </div>
            <Link
              href="/login"
              className="bg-electric-500 hover:bg-electric-400 text-white font-bold py-2 px-4 rounded-full block mb-4"
            >
              Get Started
            </Link>
          </div>

          {/* Agency */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Agency</h2>
            <p className="text-gray-400 mb-4">
              Everything in Authority + 10 agent seats, IMO/team dashboard, API
              access, custom integrations, account manager
            </p>
            <div className="text-4xl font-bold mb-4">
              ${getPrice(997)}
              <span className="text-sm text-gray-400">
                {billingAnnual ? "/yr" : "/mo"}
              </span>
            </div>
            <Link
              href="/login"
              className="bg-electric-500 hover:bg-electric-400 text-white font-bold py-2 px-4 rounded-full block mb-4"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Starcepta Bundle Banner */}
        <div className="bg-gray-800 rounded-2xl p-6 mt-12 border border-teal-500">
          <h2 className="text-2xl font-bold mb-4">
            🔗 The Insurance Agent Trust Stack
          </h2>
          <p className="text-gray-400 mb-4">
            Geothority gets you found. Starcepta turns every client into a 5-star
            review.
          </p>
          <p className="text-xl font-bold mb-4">
            Geothority Growth + Starcepta Starter = $249/mo (save $47)
          </p>
          <Link
            href="https://starcepta.com?ref=geothority-bundle"
            className="bg-electric-500 hover:bg-electric-400 text-white font-bold py-2 px-4 rounded-full block"
          >
            Get the Bundle →
          </Link>
        </div>

        {/* Add-ons section */}
        <div className="max-w-3xl mx-auto mt-12">
          <h2 className="text-2xl font-bold mb-4">Add-ons</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <li className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold">AI Content Engine</h3>
                <p className="text-gray-400 text-sm">+$49/mo</p>
              </div>
              <CheckCircle2 className="text-electric-500 w-6 h-6" />
            </li>
            <li className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Citation Cleanup</h3>
                <p className="text-gray-400 text-sm">$199 one-time</p>
              </div>
              <CheckCircle2 className="text-electric-500 w-6 h-6" />
            </li>
            <li className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Review Rocket</h3>
                <p className="text-gray-400 text-sm">+$79/mo</p>
              </div>
              <CheckCircle2 className="text-electric-500 w-6 h-6" />
            </li>
            <li className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Competitor Intel</h3>
                <p className="text-gray-400 text-sm">+$49/mo</p>
              </div>
              <CheckCircle2 className="text-electric-500 w-6 h-6" />
            </li>
          </ul>
        </div>
      </section>

      {/* Competitor Comparison Table */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How We Compare</h2>
          <p className="text-center text-gray-400 mb-10">At $149/mo, Geothority Starter delivers what $400+/mo tools can&apos;t.</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Feature</th>
                  <th className="py-3 px-4 text-sm font-bold text-electric-500 bg-electric-500/5 rounded-t-lg">Geothority $149</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-400">Birdeye $299</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-400">Podium $399</th>
                  <th className="py-3 px-4 text-sm font-medium text-gray-400">Moz Local $33</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["AI Search Optimization", true, false, false, false],
                  ["Local SEO Audit", true, false, false, true],
                  ["Competitor Watchdog", true, false, false, false],
                  ["Content Auto-Publish", true, false, false, false],
                  ["Insurance Agent Focused", true, false, false, false],
                  ["Review Management", "Via Starcepta", true, true, true],
                ] as [string, boolean | string, boolean, boolean, boolean][]).map(([feature, geo, bird, pod, moz]) => (
                  <tr key={feature} className="border-b border-gray-700/50">
                    <td className="py-3 px-4 text-sm">{feature}</td>
                    <td className="py-3 px-4 text-center bg-electric-500/5">
                      {geo === true ? <span className="text-emerald-400 font-bold">&#10003;</span> : geo === false ? <span className="text-red-400">&#10007;</span> : <span className="text-xs text-gray-400">{geo}</span>}
                    </td>
                    <td className="py-3 px-4 text-center">{bird ? <span className="text-emerald-400 font-bold">&#10003;</span> : <span className="text-red-400">&#10007;</span>}</td>
                    <td className="py-3 px-4 text-center">{pod ? <span className="text-emerald-400 font-bold">&#10003;</span> : <span className="text-red-400">&#10007;</span>}</td>
                    <td className="py-3 px-4 text-center">{moz ? <span className="text-emerald-400 font-bold">&#10003;</span> : <span className="text-red-400">&#10007;</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
