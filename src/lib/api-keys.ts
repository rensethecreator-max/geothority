import "server-only";
import { createHash } from "node:crypto";

export function hashPublicApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function normalizeAllowedOrigin(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    return null;
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!hostname || hostname.includes("..") || hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return null;
  }
  return hostname;
}

export function hostMatchesAllowedOrigin(origin: string, allowedOrigin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const allowed = allowedOrigin.toLowerCase().replace(/^www\./, "");
    return host === allowed || host.endsWith(`.${allowed}`);
  } catch {
    return false;
  }
}
