import type { SiteTag } from "@/config/tags";

/** Shared domain types for the network testing app. */

/** Geo/ASN info resolved from ip.sb, enriched with the routed prefix. */
export interface IpInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  organization?: string;
  asn?: number;
  asnOrganization?: string;
  /** Routed prefix (CIDR), e.g. "1.2.3.0/24". Resolved separately. */
  prefix?: string;
}

/**
 * Speed-test capability for a target. Only CORS-enabled endpoints can be
 * measured (reading bytes cross-origin requires permissive CORS headers).
 *  - `cloudflare`: URL accepts `?bytes=N` (exact-size payload);
 *  - `fixed`: a static file each worker re-downloads until the time budget.
 */
export interface SpeedConfig {
  kind: "cloudflare" | "fixed";
  url: string;
  /** POST endpoint for upload (上行) tests; requires CORS. Omit = download-only. */
  uploadUrl?: string;
}

/** Speed test direction. */
export type SpeedDirection = "down" | "up";

/**
 * How to probe one site for latency. Every field is optional; omitting the whole
 * `latency` config reproduces the default behavior (HEAD, `no-cors`, against
 * `latencyUrl`). Kept JSON-serializable so custom targets persist to localStorage.
 */
export interface LatencyProbe {
  /** HTTP method. Default `HEAD`. Use `GET` for servers that refuse/RST HEAD. */
  method?: "HEAD" | "GET";
  /**
   * Fetch mode. Default `no-cors` (opaque, works anywhere, status unreadable).
   * `cors` lets us read the real status — but ONLY works on endpoints that send
   * CORS headers (incl. on their error responses); elsewhere every probe throws.
   */
  mode?: "no-cors" | "cors";
  /**
   * `cors` mode only: statuses that count as a reachable success. Default `[200]`.
   * A response outside this set is a loss, but its code is still surfaced in the
   * tooltip. e.g. a `generate_204` endpoint uses `[204]`.
   */
  okStatus?: number[];
}

/** Per-probe diagnostic, parallel to a result's `samples[]` by index. */
export interface ProbeNote {
  /** HTTP status, when readable (`cors` mode). */
  status?: number;
  /** Short reason for a failed probe, e.g. "请求失败" / "超时". */
  reason?: string;
}

/**
 * Resolve a site's serving edge/PoP from a probe response. The framework fetches
 * the probe URL (HEAD by default; GET when `popBody` is set) and hands the parsed
 * `headers` + `body` here — so the parser is pure and decoupled from fetching,
 * and the same resolver can be reused across sites (e.g. every Cloudflare-fronted
 * site shares one).
 */
export type PopResolver = (res: { headers: Headers; body: string }) => CdnNode | null;

/**
 * CDN-specific PoP-detection config, grouped under a target's `cdn` field. Only
 * set on built-ins — `popInfo` is a function and functions aren't serialized, so
 * custom (localStorage-persisted) targets never carry one.
 */
export interface CdnProbe {
  /** Separate URL to read PoP info from (defaults to the target's `latencyUrl`). */
  popUrl?: string;
  /** GET the probe and read its body (e.g. Cloudflare's trace); else HEAD headers. */
  popBody?: boolean;
  /** Extract the serving edge/PoP from the probe response. */
  popInfo: PopResolver;
}

/** A site shown in the left-hand selector. */
export interface NetworkTarget {
  id: string;
  name: string;
  icon: string;
  latencyUrl: string;
  tags: SiteTag[];
  cloudflare?: boolean;
  speed?: SpeedConfig;
  /** Per-site latency probe overrides. Omit for the default HEAD/no-cors probe. */
  latency?: LatencyProbe;
  /** CDN PoP-detection config. Present only on CDN built-ins. */
  cdn?: CdnProbe;
  /**
   * CDN vendor key detected offline (Google DoH → ip.sb ASN; see CDN_DETECTED).
   * Location-independent, so it's safe to show as the site's CDN even when the
   * live PoP headers aren't CORS-readable. Built-ins only; custom targets resolve
   * their CDN live instead.
   */
  cdnVendor?: string;
  builtIn: boolean;
}

/** Aggregated latency result for one target across several samples. */
export interface LatencyResult {
  targetId: string;
  status: "idle" | "running" | "done" | "error";
  /** Per-sample round trip times in ms; `null` marks a failed (lost) probe. */
  samples: (number | null)[];
  /** Per-sample diagnostics (status / failure reason), aligned to `samples`. */
  notes?: (ProbeNote | null)[];
  min?: number;
  max?: number;
  avg?: number;
  jitter?: number;
  loss?: number;
  /** 25th percentile latency (ms). Shown for large (>16 probe) runs. */
  p25?: number;
  /** Median (50th percentile) latency (ms). */
  p50?: number;
  /** 95th percentile latency (ms). */
  p95?: number;
}

/** User-tunable test parameters (persisted to localStorage). */
export interface TestSettings {
  /** Number of latency probes per target. */
  latencyCount: number;
  /** Parallel connections for the speed test. */
  speedThreads: number;
  /**
   * Which stop condition applies — they are mutually exclusive:
   *  - "time": run for `speedDurationMs` (traffic cap ignored);
   *  - "data": run until `speedStopMB` is transferred (time ignored).
   */
  speedLimitMode: "time" | "data";
  /** Speed test time budget in ms (used when `speedLimitMode === "time"`). */
  speedDurationMs: number;
  /** Stop the speed test after this many MB (used when `speedLimitMode === "data"`; min 300). */
  speedStopMB: number | null;
  /** Ramp connections in gradually instead of all at once. */
  speedRamp: boolean;
  /** Polling interval for long-term latency monitoring, ms. */
  monitorIntervalMs: number;
  /** Direction for the speed test (上行/下行). */
  speedDirection: SpeedDirection;
}

/**
 * The CDN edge a target is served from, resolved at runtime.
 *
 * Two complementary signals: an accurate **PoP code** straight from the edge
 * (`colo`, e.g. "HKG"), and — when the edge exposes its own IP (e.g. Akamai's
 * `x-cache2`) — the **ASN + geo** of that IP looked up via ip.sb. We no longer
 * guess/label the CDN "type"; the ASN org name is the authoritative identity.
 */
export interface CdnNode {
  /** PoP / colo code reported by the edge, e.g. "HKG", "SIN". */
  colo?: string;
  /** Location hint (country code or city) reported by the edge itself. */
  location?: string;
  /** Edge server IP, when the endpoint exposes it (e.g. Akamai `x-cache2`). */
  ip?: string;
  /** ASN of the edge IP (from ip.sb). */
  asn?: number;
  /** ASN org name of the edge IP (from ip.sb), e.g. "Akamai International B.V.". */
  asnName?: string;
  /** City of the edge IP (from ip.sb). */
  city?: string;
  /** Country name of the edge IP (from ip.sb). */
  country?: string;
  /** Country code of the edge IP (from ip.sb). */
  countryCode?: string;
}

/** A single point on the live speed curve. */
export interface SpeedSample {
  t: number;
  mbps: number;
}

/** Continuously-updated metrics emitted while a speed test runs. */
export interface SpeedProgress {
  t: number;
  avgBps: number;
  maxBps: number;
  bytes: number;
  /** Connections currently transferring (for the ramp strategy). */
  activeThreads: number;
  latencyMs?: number;
  /** A new 1-second curve point, present only at second boundaries. */
  curve?: SpeedSample;
}

/** Final aggregated metrics for a speed test run. */
export interface SpeedResult {
  status: "queued" | "running" | "done" | "error";
  threads?: number;
  ramp?: boolean;
  latencyMs?: number;
  durationMs?: number;
  avgBps?: number;
  maxBps?: number;
  bytes?: number;
  /** 25th/50th/95th percentile of per-second throughput (bytes/sec). */
  p25?: number;
  p50?: number;
  p95?: number;
  error?: string;
}

/** A point on the long-term latency monitor timeline. */
export interface MonitorPoint {
  /** Seconds since monitoring started. */
  t: number;
  /** Latency in ms, or null if that probe was lost. */
  ms: number | null;
}

/** Aggregate stability stats for a monitor session. */
export interface MonitorStats {
  count: number;
  min?: number;
  max?: number;
  avg?: number;
  jitter?: number;
  loss: number;
  /** 25th/50th/95th percentile latency (ms). */
  p25?: number;
  p50?: number;
  p95?: number;
}

/**
 * One entry in the right-hand activity feed. Every test (speed or long-term
 * monitor) appends an activity; the running one updates in place.
 */
export type Activity =
  | {
      id: string;
      kind: "latency";
      target: NetworkTarget;
      running: boolean;
      result: LatencyResult;
    }
  | {
      id: string;
      kind: "speed";
      target: NetworkTarget;
      running: boolean;
      direction: SpeedDirection;
      result: SpeedResult;
      samples: SpeedSample[];
      live: SpeedProgress | null;
    }
  | {
      id: string;
      kind: "monitor";
      target: NetworkTarget;
      running: boolean;
      points: MonitorPoint[];
      stats: MonitorStats;
      startedAt: number;
    };