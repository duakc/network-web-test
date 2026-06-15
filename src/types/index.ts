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

/** A site shown in the left-hand selector. */
export interface NetworkTarget {
  id: string;
  name: string;
  icon: string;
  latencyUrl: string;
  tags: SiteTag[];
  cloudflare?: boolean;
  speed?: SpeedConfig;
  builtIn: boolean;
}

/** Aggregated latency result for one target across several samples. */
export interface LatencyResult {
  targetId: string;
  status: "idle" | "running" | "done" | "error";
  /** Per-sample round trip times in ms; `null` marks a failed (lost) probe. */
  samples: (number | null)[];
  min?: number;
  max?: number;
  avg?: number;
  jitter?: number;
  loss?: number;
}

/** User-tunable test parameters (persisted to localStorage). */
export interface TestSettings {
  /** Number of latency probes per target. */
  latencyCount: number;
  /** Parallel connections for the speed test. */
  speedThreads: number;
  /** Speed test time budget in ms. */
  speedDurationMs: number;
  /** Stop the speed test after this many MB (null = no cap). */
  speedStopMB: number | null;
  /** Ramp connections in gradually instead of all at once. */
  speedRamp: boolean;
  /** Polling interval for long-term latency monitoring, ms. */
  monitorIntervalMs: number;
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