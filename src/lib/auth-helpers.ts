/**
 * auth-helpers.ts
 * Shared helpers for Next.js API route auth + admin checks.
 */

import { createServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export interface AuthedUser {
  id: string;
  email: string;
}

/**
 * Get the authenticated user from the request.
 * Returns { user } or throws a NextResponse 401.
 */
export async function getAuthUser(
  _req: NextRequest
): Promise<{ user: AuthedUser } | { error: NextResponse }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user: { id: user.id, email: user.email! } };
}

/**
 * Check if the user is an admin (by ADMIN_EMAILS env var).
 */
export function isAdminUser(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return adminEmails.includes(email);
}

/**
 * Get the authenticated admin user from the request.
 * Returns { user } or a 401/403 NextResponse.
 */
export async function getAdminUser(
  req: NextRequest
): Promise<{ user: AuthedUser } | { error: NextResponse }> {
  const auth = await getAuthUser(req);
  if ("error" in auth) return auth;
  if (!isAdminUser(auth.user.email)) {
    return {
      error: NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 }),
    };
  }
  return auth;
}
