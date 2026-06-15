import { lookupIp } from "@/lib/network/ip-info";
import { hostOf, parseTrace } from "@/lib/network/site";
import type { CdnNode, NetworkTarget, PopResolver } from "@/types";

/**
 * Display names for the CDN vendor keys emitted by `detect-cdn` (CDN_DETECTED).
 * The vendor is location-independent (a site on Akamai is on Akamai everywhere),
 * so we can label a built-in's CDN from this map even when no live PoP header is
 * readable cross-origin.
 */
export const VENDOR_LABELS: Record<string, string> = {
  cloudflare: "Cloudflare",
  fastly: "Fastly",
  akamai: "Akamai",
  amazon: "AWS",
  google: "Google",
  azure: "Azure",
  cdn77: "CDN77",
  alibaba: "Alibaba",
  tencent: "Tencent",
  baidu: "Baidu",
  digitalocean: "DigitalOcean",
  zenlayer: "Zenlayer",
  bytedance: "ByteDance",
  incapsula: "Imperva",
  stackpath: "StackPath",
  limelight: "Edgio",
};

/** Friendly label for a detected vendor key (falls back to the raw key). */
export function vendorLabel(vendor: string): string {
  return VENDOR_LABELS[vendor] ?? vendor;
}

/**
 * Reusable PoP resolvers, decoupled from fetching.
 *
 * Each is a pure `(headers, body) => CdnNode | null` that a target binds via its
 * `popInfo` field (see targets.ts). The framework (`resolveCdnNode`) does the
 * fetch and hands the response in, then enriches any edge `ip` with ASN + geo
 * from ip.sb. Sharing is trivial — e.g. every Cloudflare-fronted site uses
 * `cloudflarePop`, EdgeIP/media/standard Akamai all use `akamaiPop`.
 */

/**
 * Cloudflare-fronted sites: live PoP colo from the `/cdn-cgi/trace` body
 * (`popBody: true`). The ASN (13335 Cloudflare) is a global constant — not
 * location-dependent — so it's safe to stamp here, letting regular sites show
 * "Cloudflare" as the CDN they use while the colo stays live per request.
 */
export const cloudflarePop: PopResolver = ({ body }) => {
  const t = parseTrace(body);
  if (!t.colo) return null;
  return { colo: t.colo, location: t.loc || undefined, asn: 13335, asnName: "Cloudflare" };
};

/**
 * Akamai (perfops) edges stamp `x-cache2: |<client>|<edge>|<parent>|…`; the 2nd
 * value is the serving edge IP, resolved to ASN + geo via ip.sb downstream.
 */
export const akamaiPop: PopResolver = ({ headers }) => {
  const ip = (headers.get("x-cache2") ?? "").split("|").filter(Boolean)[1];
  return ip ? { ip } : null;
};

/** AWS CloudFront: `X-Amz-Cf-Pop: "HKG62-P3"` → first 3 chars are the IATA code. */
export const cloudfrontPop: PopResolver = ({ headers }) => {
  const p = headers.get("x-amz-cf-pop");
  return p ? { colo: p.slice(0, 3).toUpperCase() } : null;
};

/** Fastly: `X-Served-By: "cache-hkg17921-HKG"`. */
export const fastlyPop: PopResolver = ({ headers }) => {
  const m = (headers.get("x-served-by") ?? "").match(/cache-([a-z]{3})/i);
  return m ? { colo: m[1].toUpperCase() } : null;
};

/** CacheFly: `X-CF1: "28637:fG.hkg1:co:…"` — PoP is the 2nd colon field's tail. */
export const cacheflyPop: PopResolver = ({ headers }) => {
  const pop = (headers.get("x-cf1") ?? "").split(":")[1]?.split(".").pop();
  return pop ? { colo: pop.toUpperCase() } : null;
};

/** BunnyCDN: `Server: "BunnyCDN-SG1-945"` / `"BunnyCDNE-HK1-1059"`. */
export const bunnyPop: PopResolver = ({ headers }) => {
  const m = (headers.get("server") ?? "").match(/BunnyCDN[A-Z]?-([A-Z]{2,3}\d+)/i);
  return m ? { colo: m[1].toUpperCase() } : null;
};

/** CDN77: `X-77-Pop: "hongkongHK"` (city + country code). */
export const cdn77Pop: PopResolver = ({ headers }) => {
  const pop = headers.get("x-77-pop");
  if (!pop) return null;
  const m = pop.match(/^([a-z]+)([A-Z]{2})$/);
  return m ? { colo: m[2], location: m[1] } : { colo: pop.toUpperCase() };
};

/** OVH CDN (perfops): `X-Cdn-Pop: "bhs"` (OVH datacentre code). */
export const ovhPop: PopResolver = ({ headers }) => {
  const p = headers.get("x-cdn-pop");
  return p ? { colo: p.toUpperCase() } : null;
};

/** ByteDance CDN: `Via: cache02.heshijiazhuang-cm209` → the middle token is the city. */
export const bytedancePop: PopResolver = ({ headers }) => {
  const via = headers.get("via");
  if (!via) return null;
  const city = (via.split(",")[0].trim().split(".").pop() ?? "").split("-")[0];
  return city ? { colo: city.replace(/^\w/, (c) => c.toUpperCase()) } : null;
};

/** Zenlayer: `Via: http/1.1 HK.HKG3.837.P.32.211 (Cache-…)` → region `HK`, PoP `HKG3`. */
export const zenlayerPop: PopResolver = ({ headers }) => {
  const via = headers.get("via");
  if (!via) return null;
  const node = via
    .split(",")[0]
    .trim()
    .split(/\s+/)
    .find((t) => t.includes(".") && !t.includes("/"));
  const parts = node?.split(".") ?? [];
  return parts[1] ? { colo: parts[1], location: parts[0] } : null;
};

/** CDNetworks (网宿): PoP is the trailing token of `X-Px` (e.g. "…SJW"). */
export const cdnetworksPop: PopResolver = ({ headers }) => {
  const node = (headers.get("x-px") ?? "").trim().split(/\s+/).pop() ?? "";
  const colo = node.match(/([A-Z]{2,4})$/)?.[1];
  return colo ? { colo } : null;
};

/** Enrich a node carrying an edge `ip` with ASN/geo from ip.sb. */
async function enrich(node: CdnNode | null, signal?: AbortSignal): Promise<CdnNode | null> {
  if (!node?.ip) return node;
  const geo = await lookupIp(node.ip, signal);
  if (geo) {
    node.asn = geo.asn;
    node.asnName = geo.asnName;
    node.city = geo.city;
    node.country = geo.country;
    node.countryCode = geo.countryCode;
  }
  return node;
}

/** Run a target's live PoP probe (header/body read + edge-IP enrichment). */
async function probeLivePop(
  target: NetworkTarget,
  signal?: AbortSignal,
): Promise<CdnNode | null> {
  const probe = target.cdn;
  if (!probe) return null;
  const url = probe.popUrl ?? target.latencyUrl;
  try {
    const res = await fetch(url, {
      method: probe.popBody ? "GET" : "HEAD",
      mode: "cors",
      cache: "no-store",
      referrerPolicy: "strict-origin-when-cross-origin",
      signal,
    });
    const body = probe.popBody ? await res.text() : "";
    if (!probe.popBody) res.body?.cancel().catch(() => {});
    return enrich(probe.popInfo({ headers: res.headers, body }), signal);
  } catch {
    return null;
  }
}

/**
 * Traditional live detection for targets without a bound probe (i.e. custom
 * sites): Google DoH resolves the host to an A-record IP, then ip.sb maps that
 * IP to its ASN + geo. Best-effort; returns `null` on any failure.
 */
async function resolveLiveAsn(
  host: string,
  signal?: AbortSignal,
): Promise<CdnNode | null> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`,
      { headers: { accept: "application/dns-json" }, signal },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
    const ip = (json.Answer ?? []).find((r) => r.type === 1)?.data; // type 1 = A
    if (!ip) return null;
    const geo = await lookupIp(ip, signal);
    if (!geo) return { ip };
    return {
      ip,
      asn: geo.asn,
      asnName: geo.asnName,
      city: geo.city,
      country: geo.country,
      countryCode: geo.countryCode,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a target's serving CDN / edge for display, in priority order:
 *   1. A bound live PoP probe (built-in CDN targets + Cloudflare-fronted sites) —
 *      yields the live colo and, where possible, the edge ASN/geo.
 *   2. The offline-detected vendor (built-ins) — a location-independent label
 *      (e.g. "Akamai") for sites whose PoP headers aren't CORS-readable.
 *   3. Live DoH → ip.sb ASN (custom targets) — the traditional per-user lookup.
 * Returns `null` when nothing is resolvable.
 */
export async function resolveCdnNode(
  target: NetworkTarget,
  signal?: AbortSignal,
): Promise<CdnNode | null> {
  if (target.cdn) {
    const live = await probeLivePop(target, signal);
    if (live) return live;
  }
  if (target.cdnVendor) return { asnName: vendorLabel(target.cdnVendor) };
  if (!target.builtIn) return resolveLiveAsn(hostOf(target.latencyUrl), signal);
  return null;
}