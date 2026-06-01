"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2, Globe, Building2, MapPin } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";

function ScanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [url, setUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDefaults() {
      const queryUrl = searchParams.get("url") ?? "";
      const queryBusiness = searchParams.get("business") ?? "";
      const queryCity = searchParams.get("city") ?? "";
      const queryState = searchParams.get("state") ?? "";

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        if (!cancelled) {
          setUrl((current) => current || queryUrl);
          setBusinessName((current) => current || queryBusiness);
          setCity((current) => current || queryCity);
          setState((current) => current || queryState);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("business_name, city, state, website_url")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      setUrl(queryUrl || profile?.website_url || "");
      setBusinessName(queryBusiness || profile?.business_name || "");
      setCity(queryCity || profile?.city || "");
      setState(queryState || profile?.state || "");
    }

    void loadDefaults();

    return () => {
      cancelled = true;
    };
  }, [searchParams, supabase]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setScanning(true);
    trackEvent("scan_started", { url, businessName, city, state });

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, businessName, city, state }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scan failed");
      }

      const { scan } = await res.json();
      trackEvent("scan_completed", { scanId: scan.id, url, city });
      router.push(`/scan/${scan.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setScanning(false);
    }
  };

  const usStates = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
    "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
    "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Scan Your Website</h1>
        <p className="text-[var(--muted-foreground)]">
          Enter your agency&apos;s website URL to get your Local Trust Stack™
          analysis in about 90 seconds.
        </p>
      </div>

      <form onSubmit={handleScan} className="space-y-6">
        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)] space-y-4">
          {/* URL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Globe className="w-4 h-4 text-electric-500" />
              Website URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourinsuranceagency.com"
              required
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Building2 className="w-4 h-4 text-electric-500" />
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Smith Insurance Agency"
              required
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
            />
          </div>

          {/* City & State */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <MapPin className="w-4 h-4 text-electric-500" />
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin"
                required
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              >
                <option value="">Select state...</option>
                {usStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={scanning}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-electric-500 hover:bg-electric-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-lg font-semibold transition-colors"
        >
          {scanning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scanning your website...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Scan Website
            </>
          )}
        </button>

        {scanning && (
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)] animate-pulse-slow">
              Analyzing your website across all 5 Trust Stack layers...
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto" />}>
      <ScanPageContent />
    </Suspense>
  );
}
