/** Helpers for working with arbitrary sites: icons, titles, Cloudflare probe. */

/** High-resolution favicon via Google's S2 service (falls back handled in UI). */
export function iconFor(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain,
  )}&sz=128`;
}

/** Extract the hostname from a URL, or return the input unchanged. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Extract the origin from a URL, or `null` if it cannot be parsed. */
export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Best-effort page-title fetch via a public CORS proxy.
 *
 * Reading another origin's HTML is blocked by the same-origin policy, so we
 * route through allorigins. This is inherently flaky (third-party uptime, rate
 * limits); callers must fall back to the hostname when it returns `null`.
 */
export async function fetchTitle(
  url: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const proxied = `https://api.allorigins.win/get?url=${encodeURIComponent(
      url,
    )}`;
    const res = await fetch(proxied, { signal });
    if (!res.ok) return null;
    const json = (await res.json()) as { contents?: string };
    const html = json.contents ?? "";
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = match?.[1]?.trim();
    return title && title.length > 0 ? decodeEntities(title) : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort detection of whether an origin sits behind Cloudflare, by reading
 * its `/cdn-cgi/trace` endpoint. This only succeeds when the edge permits a
 * cross-origin read; otherwise we conservatively report `false`.
 */
export async function detectCloudflare(
  origin: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/cdn-cgi/trace`, {
      mode: "cors",
      cache: "no-store",
      signal,
    });
    if (!res.ok) return false;
    const text = await res.text();
    return /\bfl=|\bcolo=/.test(text);
  } catch {
    return false;
  }
}

/** Minimal HTML entity decoding for titles. */
function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}