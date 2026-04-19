/**
 * API Response Helpers
 * Standardized response formatting for the public API.
 * Includes pagination, CORS headers, and cache control.
 */

import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://geothority.io",
  "http://localhost:3000",
];

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasNext: boolean;
    nextUrl: string | null;
  };
  meta: {
    generatedAt: string;
    cacheMaxAge: number;
  };
}

export function apiSuccess<T>(
  data: T,
  status = 200,
  options?: { cacheMaxAge?: number; staleWhileRevalidate?: number }
): NextResponse {
  const cacheMaxAge = options?.cacheMaxAge ?? 300;
  const swr = options?.staleWhileRevalidate ?? 3600;

  const response = NextResponse.json(data, { status });
  response.headers.set("Cache-Control", `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${swr}`);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Request-Id", crypto.randomUUID());
  return response;
}

export function apiPaginated<T>(
  items: T[],
  total: number,
  offset: number,
  limit: number,
  baseUrl: string,
  options?: { cacheMaxAge?: number }
): NextResponse {
  const hasNext = offset + limit < total;
  const nextUrl = hasNext ? `${baseUrl}?offset=${offset + limit}&limit=${limit}` : null;

  const body: PaginatedResponse<T> = {
    data: items,
    pagination: { total, offset, limit, hasNext, nextUrl },
    meta: {
      generatedAt: new Date().toISOString(),
      cacheMaxAge: options?.cacheMaxAge ?? 300,
    },
  };

  return apiSuccess(body, 200, options);
}

export function apiError(message: string, status = 400, details?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    { error: message, status, ...(details && { details }) },
    { status }
  );
}

export function apiNotFound(resource: string): NextResponse {
  return apiError(`${resource} not found`, 404);
}

/**
 * Apply CORS headers for public API access.
 */
export function withCors(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o))
    ? origin
    : ALLOWED_ORIGINS[0];

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}
