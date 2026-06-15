/** Helpers for working with arbitrary sites: icons, titles, CDN edge probe. */

import type { CdnNode } from "@/types";

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

/** Parse a `key=value\n` trace body (e.g. Cloudflare's) into a flat record. */
export function parseTrace(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) out[line.slice(0, eq)] = line.slice(eq + 1).trim();
  }
  return out;
}

/** PoP code (IATA / country code) → friendly city/country name. Common subset. */
const PLACE_NAMES: Record<string, string> = {
  // IATA airport codes (CDN colos).
  HKG: "香港", LAX: "洛杉矶", SJC: "圣何塞", SEA: "西雅图", NRT: "东京",
  KIX: "大阪", ICN: "首尔", SIN: "新加坡", FRA: "法兰克福", AMS: "阿姆斯特丹",
  LHR: "伦敦", CDG: "巴黎", IAD: "华盛顿", EWR: "纽瓦克", ORD: "芝加哥",
  DFW: "达拉斯", MIA: "迈阿密", ATL: "亚特兰大", SFO: "旧金山", TPE: "台北",
  BKK: "曼谷", KUL: "吉隆坡", BOM: "孟买", DEL: "新德里", SYD: "悉尼",
  DXB: "迪拜", GRU: "圣保罗", JNB: "约翰内斯堡", MAD: "马德里", MXP: "米兰",
  ARN: "斯德哥尔摩", WAW: "华沙", PRG: "布拉格", VIE: "维也纳", ZRH: "苏黎世",
  YYZ: "多伦多", YVR: "温哥华", MEL: "墨尔本", CGK: "雅加达", MNL: "马尼拉",
  SZX: "深圳", PVG: "上海", FOC: "福州", CAN: "广州", TSN: "天津",
  // ISO country codes (when a PoP only exposes the country).
  HK: "香港", SG: "新加坡", US: "美国", JP: "日本", KR: "韩国", CN: "中国",
  TW: "台湾", MO: "澳门", GB: "英国", DE: "德国", FR: "法国", NL: "荷兰",
};

/** City-state country codes where the ip.sb city is a too-granular district. */
const CITY_STATES = new Set(["HK", "SG", "MO", "MC", "GI"]);

/** What to display for a CDN node, plus a friendly name to reveal on hover. */
export interface NodePlace {
  /** Displayed text — the raw PoP/airport code when the edge reports one. */
  label: string;
  /** Friendly translated name, shown only on hover (and only when label is a code). */
  title?: string;
}

/**
 * Place for a CDN node. A header-reported PoP/colo code (e.g. "HKG") is the most
 * universal identifier, so we show the *code* and reveal the friendly Chinese
 * name on hover. ip.sb-resolved edges have no colo code, so we show the place
 * name directly — city-level, coarsened to the country for city-states (Hong
 * Kong, Singapore…) where ip.sb returns a too-granular district.
 */
export function cdnNodePlace(node: CdnNode): NodePlace {
  // Header-reported PoP code — show the code, translate on hover.
  if (node.colo) {
    return { label: node.colo, title: PLACE_NAMES[node.colo] ?? node.location };
  }
  // ip.sb-resolved edge — no colo code, so show the place name itself.
  if (node.countryCode || node.city || node.country) {
    if (node.countryCode && CITY_STATES.has(node.countryCode)) {
      return { label: PLACE_NAMES[node.countryCode] ?? node.country ?? node.countryCode };
    }
    return { label: node.city ?? PLACE_NAMES[node.countryCode ?? ""] ?? node.country ?? "" };
  }
  return { label: node.location ?? "" };
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