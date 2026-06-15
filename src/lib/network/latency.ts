/**
 * Browser-based latency measurement.
 *
 * Browsers cannot send ICMP echoes, so we approximate round-trip time with a
 * `no-cors` fetch and time the wall clock around it. A warm-up probe (not
 * counted) absorbs TCP/TLS setup. Samples are kept in order, with `null`
 * marking a lost probe, so callers can render every attempt.
 *
 * Each probe also returns a `ProbeNote` (status / failure reason). In the
 * default `no-cors` mode the response is opaque so no status is readable; a
 * per-site `LatencyProbe` can switch to `cors` mode against a CORS-enabled
 * endpoint to capture the real HTTP status (e.g. surface `403` instead of a
 * generic "lost probe").
 */

import { measureTelegramRtt } from "@/lib/network/telegram";
import type { LatencyProbe, ProbeNote } from "@/types";

export interface LatencyStats {
  /** Ordered samples; `null` = lost probe. */
  samples: (number | null)[];
  /** Per-sample diagnostics, aligned to `samples`. */
  notes: (ProbeNote | null)[];
  min: number;
  max: number;
  avg: number;
  jitter: number;
  loss: number;
  /** 25th percentile latency (ms). NaN when no successful probes. */
  p25: number;
  /** Median (50th percentile) latency (ms). */
  p50: number;
  /** 95th percentile latency (ms). */
  p95: number;
}

/** Outcome of one probe: the RTT (null = lost) plus an optional diagnostic. */
interface ProbeResult {
  rtt: number | null;
  note: ProbeNote | null;
}

/**
 * HTTP transport — time a `no-cors`/`cors` fetch. HEAD avoids downloading the
 * body (we want the round-trip, not the response); a per-site `method: "GET"`
 * handles servers that refuse HEAD. `cors` mode reads the real status (only on
 * CORS-enabled endpoints); `no-cors` is opaque but works everywhere.
 */
function httpProbe(
  baseUrl: string,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  probe: LatencyProbe | undefined,
): Promise<ProbeResult> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const method = probe?.method ?? "HEAD";
  const mode = probe?.mode ?? "no-cors";
  // No cache-buster query: a unique param forces a CDN edge-cache MISS (origin
  // pull — slower, noisier, heavier on the site, and some WAFs 4xx unknown
  // params). `cache: "no-store"` already stops the browser reusing its own cache,
  // so we hit the same URL and let the CDN serve its warm edge copy = real edge RTT.
  const probeUrl = baseUrl;

  const start = performance.now();
  return (async () => {
    try {
      const res = await fetch(probeUrl, {
        method,
        mode,
        cache: "no-store",
        // NB: `redirect: "manual"` is illegal with `mode: "no-cors"` (the browser
        // requires "follow"), so a 3xx origin root is followed to its final hop.
        signal: controller.signal,
      });
      const rtt = performance.now() - start;
      if (mode === "cors") {
        // Status is readable; validate it against the per-site allow-list.
        const ok = (probe?.okStatus ?? [200]).includes(res.status);
        return { rtt: ok ? rtt : null, note: { status: res.status } };
      }
      // no-cors: response is opaque (any reply, incl. 4xx, resolves here).
      return { rtt, note: null };
    } catch {
      // Network error, CORS block, timeout, or abort — all count as a lost probe.
      return { rtt: null, note: { reason: timedOut ? "超时" : "请求失败" } };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  })();
}

export interface MeasureLatencyOptions {
  count?: number;
  timeoutMs?: number;
  /** Skip the warm-up probe (used by long-term monitoring, already warm). */
  skipWarmup?: boolean;
  /** Per-site probe overrides (method/mode/status validation). */
  probe?: LatencyProbe;
  onSample?: (rtt: number | null, note: ProbeNote | null, index: number) => void;
  signal?: AbortSignal;
}

export async function measureLatency(
  url: string,
  options: MeasureLatencyOptions = {},
): Promise<LatencyStats> {
  const {
    count = 16,
    timeoutMs = 8000,
    skipWarmup = false,
    probe,
    onSample,
    signal,
  } = options;

  // WebSocket targets (Telegram DCs) are measured over a single reused MTProto
  // connection with repeated `req_pq` pings — see telegram.ts. Everything else
  // is HTTP fetch, one (connection-reused) request per sample.
  if (/^wss?:/i.test(url)) {
    const { samples, notes } = await measureTelegramRtt(url, {
      count,
      timeoutMs,
      onSample,
      signal,
    });
    return summarize(samples, notes);
  }

  if (!skipWarmup) await httpProbe(url, timeoutMs, signal, probe);

  const samples: (number | null)[] = [];
  const notes: (ProbeNote | null)[] = [];
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) break;
    const { rtt, note } = await httpProbe(url, timeoutMs, signal, probe);
    samples.push(rtt);
    notes.push(note);
    onSample?.(rtt, note, i);
  }

  return summarize(samples, notes);
}

/** Compute distribution stats from an ordered sample list (ignoring losses). */
export function summarize(
  samples: (number | null)[],
  notes: (ProbeNote | null)[] = [],
): LatencyStats {
  const ok = samples.filter((s): s is number => s !== null);
  const sorted = [...ok].sort((a, b) => a - b);
  return {
    samples,
    notes,
    min: ok.length ? Math.min(...ok) : NaN,
    max: ok.length ? Math.max(...ok) : NaN,
    avg: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN,
    jitter: computeJitter(ok),
    loss: samples.length ? (samples.length - ok.length) / samples.length : 0,
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
  };
}

/**
 * Linear-interpolated percentile of an already-ascending list. Returns NaN for
 * an empty list. p=50 yields the median.
 */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const rank = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (rank - lo);
}

function computeJitter(samples: number[]): number {
  if (samples.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < samples.length; i++) {
    sum += Math.abs(samples[i] - samples[i - 1]);
  }
  return sum / (samples.length - 1);
}