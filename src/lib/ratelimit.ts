import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createOptionalServiceClient } from "@/lib/supabase/server";

// Only initialize if Upstash env vars are present
const getRedis = () => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
};

const redis = getRedis();

type RateLimitConfig = {
  redis: Ratelimit | null;
  limit: number;
  windowSeconds: number;
};

function config(limit: number, windowSeconds: number, prefix: string): RateLimitConfig {
  return {
    limit,
    windowSeconds,
    redis: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      analytics: true,
      prefix,
    }) : null,
  };
}

export const scanRatelimit = config(3, 86400, "geo:scan");
export const contentRatelimit = config(10, 86400, "geo:content");
export const chatRatelimit = config(30, 3600, "geo:chat");

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
  unavailable?: true;
};

function unavailable(): RateLimitResult {
  return { allowed: false, remaining: 0, reset: 0, unavailable: true };
}

export async function checkRateLimit(
  limiter: RateLimitConfig,
  identifier: string
): Promise<RateLimitResult> {
  try {
    if (limiter.redis) {
      const result = await limiter.redis.limit(identifier);
      return { allowed: result.success, remaining: result.remaining, reset: result.reset };
    }

    // A server-only, atomic database counter preserves quotas on deployments
    // without Redis. Never switch stores after a Redis error: that would give
    // the same caller a second quota during an outage.
    const supabase = createOptionalServiceClient();
    if (!supabase) {
      if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
        return { allowed: true, remaining: 999, reset: 0 };
      }
      console.error("Rate limiting requires Redis or the Supabase service client.");
      return unavailable();
    }

    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_identifier: identifier,
      p_limit: limiter.limit,
      p_window_seconds: limiter.windowSeconds,
    });
    const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
    const reset = typeof row?.reset_at === "string" ? Date.parse(row.reset_at) : NaN;
    if (error || typeof row?.allowed !== "boolean"
      || !Number.isInteger(row?.remaining) || row.remaining < 0 || row.remaining >= limiter.limit
      || (!row.allowed && row.remaining !== 0) || !Number.isFinite(reset) || reset <= 0) {
      console.error("Database rate-limit check failed.");
      return unavailable();
    }
    return { allowed: row.allowed, remaining: row.remaining, reset };
  } catch {
    console.error("Rate-limit service is unavailable.");
    return unavailable();
  }
}
