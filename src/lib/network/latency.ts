/**
 * Browser-based latency measurement.
 *
 * Browsers cannot send ICMP echoes, so we approximate round-trip time with a
 * `no-cors` fetch and time the wall clock around it. A warm-up probe (not
 * counted) absorbs TCP/TLS setup. Samples are kept in order, with `null`
 * marking a lost probe, so callers can render every attempt.
 */

export interface LatencyStats {
  /** Ordered samples; `null` = lost probe. */
  samples: (number | null)[];
  min: number;
  max: number;
  avg: number;
  jitter: number;
  loss: number;
}

async function probeOnce(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<number | null> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const probeUrl = `${url}${url.includes("?") ? "&" : "?"}_=${performance.now()}`;
  const start = performance.now();
  try {
    // HEAD avoids downloading the body — we want network round-trip, not the
    // full response. Servers that reject HEAD still return headers (opaque in
    // no-cors mode), which is enough to time the round trip.
    await fetch(probeUrl, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return performance.now() - start;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export interface MeasureLatencyOptions {
  count?: number;
  timeoutMs?: number;
  /** Skip the warm-up probe (used by long-term monitoring, already warm). */
  skipWarmup?: boolean;
  onSample?: (rtt: number | null, index: number) => void;
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
    onSample,
    signal,
  } = options;

  if (!skipWarmup) await probeOnce(url, timeoutMs, signal);

  const samples: (number | null)[] = [];
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) break;
    const rtt = await probeOnce(url, timeoutMs, signal);
    samples.push(rtt);
    onSample?.(rtt, i);
  }

  return summarize(samples);
}

/** Compute distribution stats from an ordered sample list (ignoring losses). */
export function summarize(samples: (number | null)[]): LatencyStats {
  const ok = samples.filter((s): s is number => s !== null);
  return {
    samples,
    min: ok.length ? Math.min(...ok) : NaN,
    max: ok.length ? Math.max(...ok) : NaN,
    avg: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN,
    jitter: computeJitter(ok),
    loss: samples.length ? (samples.length - ok.length) / samples.length : 0,
  };
}

function computeJitter(samples: number[]): number {
  if (samples.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < samples.length; i++) {
    sum += Math.abs(samples[i] - samples[i - 1]);
  }
  return sum / (samples.length - 1);
}