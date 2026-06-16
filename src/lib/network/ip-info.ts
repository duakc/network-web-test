import type { IpInfo } from "@/types";

/** Raw shape returned by the ip.sb geoip endpoint (subset we use). */
interface IpSbGeoIp {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  organization?: string;
  asn?: number;
  asn_organization?: string;
}

/** Raw shape returned by RIPEstat network-info (subset we use). */
interface RipeNetworkInfo {
  data?: {
    prefix?: string;
    asns?: string[];
  };
}

/** Map an ip.sb geoip payload to our IpInfo, then merge in the routed prefix. */
async function geoipFromUrl(
  url: string,
  signal?: AbortSignal,
): Promise<IpInfo> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`ip.sb 返回 ${res.status}`);
  const data = (await res.json()) as IpSbGeoIp;
  const info: IpInfo = {
    ip: data.ip,
    city: data.city,
    region: data.region,
    country: data.country,
    countryCode: data.country_code,
    organization: data.organization,
    asn: data.asn,
    asnOrganization: data.asn_organization,
  };
  // Best-effort prefix lookup; failure here must not break the whole card.
  try {
    info.prefix = await fetchPrefix(data.ip, signal);
  } catch {
    /* prefix is optional */
  }
  return info;
}

/** Look up the visitor's public IP plus geo/ASN details via ip.sb (auto family). */
export function fetchIpInfo(signal?: AbortSignal): Promise<IpInfo> {
  return geoipFromUrl("https://api.ip.sb/geoip", signal);
}

/**
 * Force the IPv4 / IPv6 view via ip.sb's family-specific subdomains. Either may
 * reject (no v6 connectivity, etc.) — callers treat that as "not available" and
 * simply hide the line.
 */
export function fetchIpInfoV4(signal?: AbortSignal): Promise<IpInfo> {
  return geoipFromUrl("https://api-ipv4.ip.sb/geoip", signal);
}
export function fetchIpInfoV6(signal?: AbortSignal): Promise<IpInfo> {
  return geoipFromUrl("https://api-ipv6.ip.sb/geoip", signal);
}

/** Resolve the announced prefix (CIDR) for an IP using RIPEstat. */
async function fetchPrefix(
  ip: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const url = `https://stat.ripe.net/data/network-info/data.json?resource=${encodeURIComponent(
    ip,
  )}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return undefined;
  const json = (await res.json()) as RipeNetworkInfo;
  return json.data?.prefix;
}

/** Geo/ASN for an arbitrary IP (a CDN edge), looked up via ip.sb. */
export interface IpGeo {
  asn?: number;
  asnName?: string;
  city?: string;
  country?: string;
  countryCode?: string;
}

/**
 * Resolve geo/ASN for a specific IP via ip.sb. Used to identify a CDN edge from
 * its server IP. Best-effort: returns `null` on any failure.
 */
export async function lookupIp(
  ip: string,
  signal?: AbortSignal,
): Promise<IpGeo | null> {
  try {
    const res = await fetch(
      `https://api.ip.sb/geoip/${encodeURIComponent(ip)}`,
      {
        headers: { Accept: "application/json" },
        signal,
      },
    );
    if (!res.ok) return null;
    const d = (await res.json()) as IpSbGeoIp & { isp?: string };
    return {
      asn: d.asn,
      asnName: d.asn_organization || d.organization,
      city: d.city,
      country: d.country,
      countryCode: d.country_code,
    };
  } catch {
    return null;
  }
}

export function PeerAsUrl(prefix: string): string {
  return `https://peer.as/${prefix}`;
}

/** External link to bgp.tools for a given prefix. */
export function bgpToolsUrl(prefix: string): string {
  return `https://bgp.tools/prefix/${prefix}`;
}

/** External link to bgp.tools for a given ASN. */
export function bgpToolsAsnUrl(asn: number): string {
  return `https://bgp.tools/as/${asn}`;
}

/** External link to PeeringDB for a given ASN. */
export function peeringDbUrl(asn: number): string {
  return `https://www.peeringdb.com/asn/${asn}`;
}
