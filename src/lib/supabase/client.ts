import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase env vars missing — returning no-op client");
    return null as any;
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
