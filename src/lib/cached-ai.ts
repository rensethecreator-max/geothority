/**
 * Cached AI — Geothority
 * Wraps AI calls with a Supabase cache layer (table: ai_cache).
 * TTL: 24 hours. Saves money on repeated checks for the same business.
 *
 * Table schema expected in Supabase:
 *   ai_cache (
 *     key       text primary key,
 *     response  text not null,
 *     created_at timestamptz default now(),
 *     expires_at timestamptz not null
 *   )
 */

import crypto from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";

const CACHE_TTL_HOURS = 24;

function makeKey(namespace: string, params: Record<string, unknown>): string {
  const serialized = JSON.stringify(
    Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))
  );
  return `${namespace}:${crypto.createHash("sha256").update(serialized).digest("hex")}`;
}

export async function getCachedAI<T>(
  namespace: string,
  params: Record<string, unknown>,
  fetcher: () => Promise<T>
): Promise<{ data: T; fromCache: boolean }> {
  const key = makeKey(namespace, params);

  try {
    const supabase = await createServerSupabase();

    // Try to get from cache
    const { data: cached } = await supabase
      .from("ai_cache")
      .select("response, expires_at")
      .eq("key", key)
      .single();

    if (cached && cached.expires_at && new Date(cached.expires_at) > new Date()) {
      try {
        const parsed = JSON.parse(cached.response) as T;
        return { data: parsed, fromCache: true };
      } catch {
        // Corrupt cache entry — fall through to fetcher
      }
    }

    // Cache miss — call the real fetcher
    const fresh = await fetcher();
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();

    // Upsert into cache (ignore errors — cache is best-effort)
    await supabase.from("ai_cache").upsert({
      key,
      response: JSON.stringify(fresh),
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    return { data: fresh, fromCache: false };
  } catch {
    // If Supabase is unavailable (e.g., test env), just run the fetcher directly
    const fresh = await fetcher();
    return { data: fresh, fromCache: false };
  }
}

/**
 * Convenience wrapper for AI Overview scans.
 * Key: business name + city + business type (normalized).
 */
export async function getCachedAIOverview<T>(
  businessName: string,
  city: string,
  businessType: string,
  fetcher: () => Promise<T>
): Promise<{ data: T; fromCache: boolean }> {
  return getCachedAI(
    "ai_overview",
    {
      businessName: businessName.toLowerCase().trim(),
      city: city.toLowerCase().trim(),
      businessType: businessType.toLowerCase().trim(),
    },
    fetcher
  );
}
