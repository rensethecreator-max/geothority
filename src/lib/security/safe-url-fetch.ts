import "server-only";

import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isPublicAddress, normalizePublicHttpUrl } from "@/lib/security/public-url";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;

type Address = { address: string; family: number };
type SafeFetchOptions = { timeoutMs?: number; maxBytes?: number };

async function resolvePublicAddress(hostname: string): Promise<Address> {
  if (isIP(hostname)) {
    if (!isPublicAddress(hostname)) throw new Error("Private or reserved IP addresses are not allowed");
    return { address: hostname, family: isIP(hostname) };
  }

  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw new Error("The host resolves to a private or reserved address");
  }
  return { address: addresses[0].address, family: addresses[0].family };
}

function requestPinned(url: URL, address: Address, timeoutMs: number, maxBytes: number) {
  return new Promise<{ status: number; location: string | null; text: string }>((resolve, reject) => {
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) callback(null, [address]);
      else callback(null, address.address, address.family);
    };
    const request = transport(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Geothority/1.0; +https://geothority.io)",
        Accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.1",
        "Accept-Encoding": "identity",
      },
      lookup: pinnedLookup,
    }, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location ?? null;
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        response.resume();
        clearDeadline();
        resolve({ status, location, text: "" });
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        clearDeadline();
        reject(new Error(`Website responded with HTTP ${status}`));
        return;
      }

      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > maxBytes) {
          response.destroy(new Error("Website response exceeded the scan size limit"));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => {
        clearDeadline();
        resolve({ status, location: null, text: Buffer.concat(chunks).toString("utf8") });
      });
      response.on("error", (error) => {
        clearDeadline();
        reject(error);
      });
    });

    const deadlineTimer = setTimeout(() => request.destroy(new Error("Website scan timed out")), timeoutMs);
    deadlineTimer.unref();
    const clearDeadline = () => clearTimeout(deadlineTimer);
    request.on("error", (error) => {
      clearDeadline();
      reject(error);
    });
    request.end();
  });
}

export async function fetchPublicText(value: string, options: SafeFetchOptions = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  let currentUrl = normalizePublicHttpUrl(value);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    currentUrl = normalizePublicHttpUrl(currentUrl.toString());
    const hostname = currentUrl.hostname.replace(/^\[|\]$/g, "");
    const address = await resolvePublicAddress(hostname);
    const response = await requestPinned(currentUrl, address, timeoutMs, maxBytes);

    if (response.location) {
      if (redirectCount === MAX_REDIRECTS) throw new Error("Too many website redirects");
      currentUrl = normalizePublicHttpUrl(new URL(response.location, currentUrl).toString());
      continue;
    }

    return { ...response, finalUrl: currentUrl.toString() };
  }

  throw new Error("Too many website redirects");
}
