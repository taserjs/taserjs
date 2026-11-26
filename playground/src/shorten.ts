const SPOO_ENDPOINT = "https://spoo.me/api/v1/shorten";
const DAGD_ENDPOINT = "https://da.gd/s";
const SPOO_MAX_URL_LENGTH = 8_192;
const DAGD_MAX_URL_LENGTH = 4_000;
const REQUEST_TIMEOUT_MS = 6_000;

export type ShortenerProvider = "spoo.me" | "da.gd";
export type ShortenFallbackReason = "local-origin" | "too-long" | "unavailable";

export interface ShortenResult {
  url: string;
  shortened: boolean;
  provider?: ShortenerProvider;
  reason?: ShortenFallbackReason;
}

interface CacheEntry {
  shortUrl: string;
  provider: ShortenerProvider;
}

const shortenCache = new Map<string, CacheEntry>();

export function clearShortenCache(): void {
  shortenCache.clear();
}

export function isPublicShareUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return false;
  }
  return true;
}

function createTimeoutSignal(): AbortSignal | null {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  }
  return null;
}

async function shortenWithSpoo(rawUrl: string, fetchImpl: typeof fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(SPOO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ long_url: rawUrl }),
      signal: createTimeoutSignal(),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { short_url?: unknown };
    if (typeof data.short_url === "string" && /^https?:\/\/.+/.test(data.short_url)) {
      return data.short_url;
    }
    return null;
  } catch (err) {
    console.error("Error shortening URL with spoo.me:", err);
    return null;
  }
}

async function shortenWithDagd(rawUrl: string, fetchImpl: typeof fetch): Promise<string | null> {
  if (rawUrl.length > DAGD_MAX_URL_LENGTH) return null;
  try {
    const target = `${DAGD_ENDPOINT}?url=${encodeURIComponent(rawUrl)}`;
    const response = await fetchImpl(target, {
      method: "GET",
      signal: createTimeoutSignal(),
    });
    if (!response.ok) return null;
    const text = (await response.text()).trim();
    if (text.startsWith("https://da.gd/") && text.length > "https://da.gd/".length) {
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Shorten a shareable playground URL using spoo.me (POST, up to 8,192 chars),
 * falling back to da.gd (GET), and finally to the raw URL on local origins or failure.
 */
export async function shortenUrl(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ShortenResult> {
  if (!isPublicShareUrl(rawUrl)) {
    return { url: rawUrl, shortened: false, reason: "local-origin" };
  }

  const cached = shortenCache.get(rawUrl);
  if (cached) {
    return { url: cached.shortUrl, shortened: true, provider: cached.provider };
  }

  if (rawUrl.length > SPOO_MAX_URL_LENGTH) {
    return { url: rawUrl, shortened: false, reason: "too-long" };
  }

  const spooUrl = await shortenWithSpoo(rawUrl, fetchImpl);
  if (spooUrl) {
    shortenCache.set(rawUrl, { shortUrl: spooUrl, provider: "spoo.me" });
    return { url: spooUrl, shortened: true, provider: "spoo.me" };
  }

  const dagdUrl = await shortenWithDagd(rawUrl, fetchImpl);
  if (dagdUrl) {
    shortenCache.set(rawUrl, { shortUrl: dagdUrl, provider: "da.gd" });
    return { url: dagdUrl, shortened: true, provider: "da.gd" };
  }

  return { url: rawUrl, shortened: false, reason: "unavailable" };
}
