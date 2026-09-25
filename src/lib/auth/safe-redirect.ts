const REDIRECT_ORIGIN = "https://geothority.invalid";

/** Accept only same-origin relative paths for post-authentication navigation. */
export function getSafeRedirect(value?: string | null, fallback = "/dashboard") {
  if (
    !value
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, REDIRECT_ORIGIN);
    if (parsed.origin !== REDIRECT_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
