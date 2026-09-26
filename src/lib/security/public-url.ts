import { isIP } from "node:net";

function ipv4Number(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function inIpv4Range(address: string, network: string, prefix: number) {
  const value = ipv4Number(address);
  const base = ipv4Number(network);
  if (value === null || base === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (base & mask);
}

export function isPublicAddress(rawAddress: string) {
  const address = rawAddress.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  const family = isIP(address);
  if (family === 4) {
    const nonPublicRanges: Array<[string, number]> = [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
      ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
    ];
    return !nonPublicRanges.some(([network, prefix]) => inIpv4Range(address, network, prefix));
  }

  if (family === 6) {
    const globalUnicast = /^2[0-9a-f]{3}:/i.test(address);
    const specialUse = address.startsWith("2001:db8:")
      || address.startsWith("2001:0000:")
      || address.startsWith("2002:");
    return globalUnicast && !specialUse;
  }

  return false;
}

export function normalizePublicHttpUrl(value: string) {
  if (typeof value !== "string" || value.length > 2048) {
    throw new Error("URL is invalid or too long");
  }
  const trimmed = value.trim();
  const explicitScheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)?.[1];
  if (explicitScheme && !["http", "https"].includes(explicitScheme.toLowerCase())) {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme);

  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed");
  if (parsed.username || parsed.password) throw new Error("URLs with credentials are not allowed");
  if (parsed.port && !["80", "443"].includes(parsed.port)) throw new Error("Only standard web ports are allowed");

  parsed.hash = "";
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !hostname
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || hostname.endsWith(".test")
    || hostname === "metadata.google.internal"
  ) {
    throw new Error("Private or reserved hosts are not allowed");
  }
  if (isIP(hostname) && !isPublicAddress(hostname)) {
    throw new Error("Private or reserved IP addresses are not allowed");
  }
  return parsed;
}
