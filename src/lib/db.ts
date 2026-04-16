/**
 * db.ts
 * Thin wrapper around Supabase service client for SQL operations.
 * Used by the SaaS package API routes.
 */

import { createServiceClient } from "@/lib/supabase/server";

export type DbRow = Record<string, unknown>;

export interface DbResult {
  rows: DbRow[];
  rowCount?: number;
}

/**
 * Execute a raw SQL query using the Supabase service role.
 * Returns rows array.
 */
export async function dbQuery(
  query: string,
  params?: unknown[]
): Promise<DbResult> {
  const supabase = createServiceClient();
  
  // Use Supabase's rpc for parameterized queries or direct from the client
  // We'll use pg-compatible syntax through PostgREST
  const { data, error } = await supabase.rpc("exec_sql", {
    query_text: query,
    query_params: params ?? [],
  });

  if (error) {
    throw new Error(`DB query error: ${error.message}`);
  }

  return { rows: (data as DbRow[]) ?? [], rowCount: (data as DbRow[])?.length ?? 0 };
}

/**
 * Simple table operations using Supabase JS client (preferred over raw SQL).
 */
export function getDb() {
  return createServiceClient();
}
