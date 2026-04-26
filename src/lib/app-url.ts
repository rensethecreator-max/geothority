function normalizeUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, "");
  }

  return `https://${trimmed.replace(/^\/+/, "").replace(/\/$/, "")}`;
}

export function getAppUrl() {
  return (
    normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeUrl(process.env.APP_URL) ||
    normalizeUrl(process.env.RAILWAY_PUBLIC_DOMAIN) ||
    normalizeUrl(process.env.RAILWAY_STATIC_URL) ||
    normalizeUrl(process.env.VERCEL_URL) ||
    `http://localhost:${process.env.PORT || "3010"}`
  );
}
