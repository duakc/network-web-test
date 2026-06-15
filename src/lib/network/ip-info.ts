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

/**
 * Look up the visitor's public IP plus geo/ASN details via ip.sb.
 * The routed prefix is resolved separately (RIPEstat) and merged in,
 * since ip.sb does not expose the announced prefix.
 */
export async function fetchIpInfo(signal?: AbortSignal): Promise<IpInfo> {
  const res = await fetch("https://api.ip.sb/geoip", {
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

/** External link to bgp.tools for a given prefix. */
export function bgpToolsUrl(prefix: string): string {
  return `https://bgp.tools/prefix/${prefix}`;
}

/** External link to PeeringDB for a given ASN. */
export function peeringDbUrl(asn: number): string {
  return `https://www.peeringdb.com/asn/${asn}`;
}