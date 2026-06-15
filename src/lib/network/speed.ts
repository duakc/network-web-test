import { toMbps } from "@/lib/format";
import { percentile } from "@/lib/network/latency";
import type { SpeedConfig, SpeedProgress, SpeedResult } from "@/types";

/**
 * Multi-threaded download-speed measurement.
 *
 * N concurrent connections fold their bytes into one shared counter. The live
 * curve is reported as **per-second averages** (one point per elapsed second),
 * which is far more stable than instantaneous chunk rates. The headline average
 * is computed from the first received byte (excluding connection setup).
 *
 * Only CORS-enabled sources can be measured. To see how a saturated link
 * affects latency, run a long-term monitor on another target at the same time.
 */

export interface RunSpeedTestOptions {
  threads: number;
  durationMs: number;
  stopBytes?: number | null;
  ramp?: boolean;
  /**
   * Window over which ramped threads stagger their start. Defaults to
   * `durationMs`. In data-capped mode `durationMs` is pushed far out (so only
   * the byte cap stops the run), so the caller passes the configured duration
   * here to keep ramp pacing sane.
   */
  rampWindowMs?: number;
  /** "down" streams a payload in; "up" POSTs a payload out (needs uploadUrl). */
  direction?: "down" | "up";
  onProgress?: (progress: SpeedProgress) => void;
  sampleIntervalMs?: number;
  signal?: AbortSignal;
}

/**
 * Cloudflare's `speed.cloudflare.com/__down` rejects `?bytes=` values at/above
 * ~100 MB with **HTTP 403** *unless* the request carries a `Referer` (the cap is
 * lifted once any referrer is present). Browsers send the page origin as the
 * referrer by default, and we also force one on the fetch (see `streamOnce`), so
 * a larger 300 MiB payload streams fine and re-loops to fill the time budget.
 */
const CLOUDFLARE_BYTES_PER_THREAD = 300 * 1024 * 1024; // 300 MiB per request.

/** A speed run always transfers at least this much before it may stop. */
const MIN_SPEED_BYTES = 300 * 1024 * 1024; // 300 MiB minimum sample.
/**
 * Per-request upload payload (reused across requests/threads). The Blob is left
 * type-less on purpose: a typed body (or an `xhr.upload` progress listener) makes
 * the cross-origin POST "non-simple" and triggers a CORS preflight, which
 * `speed.cloudflare.com/__up` answers with 400 — so we keep it a simple request
 * and account bytes per completed chunk instead.
 */
const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
let uploadBody: Blob | null = null;
function getUploadBody(): Blob {
  if (!uploadBody) uploadBody = new Blob([new Uint8Array(UPLOAD_CHUNK_BYTES)]);
  return uploadBody;
}

interface Shared {
  bytes: number;
  firstByteAt: number | null;
  activeThreads: number;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
  });
}

export async function runSpeedTest(
  config: SpeedConfig,
  options: RunSpeedTestOptions,
): Promise<SpeedResult> {
  const {
    threads,
    durationMs,
    stopBytes = null,
    ramp = false,
    rampWindowMs = durationMs,
    direction = "down",
    onProgress,
    sampleIntervalMs = 200,
    signal,
  } = options;
  const threadCount = Math.max(1, threads);

  if (direction === "up" && !config.uploadUrl) {
    throw new Error("该网站不支持上行测速");
  }

  const shared: Shared = { bytes: 0, firstByteAt: null, activeThreads: 0 };
  const start = performance.now();

  // Minimum transfer floor (download only): a run never stops before
  // MIN_SPEED_BYTES, so even a fast link that blows past the time budget still
  // measures a meaningful sample (and a too-small 流量上限 is raised to this
  // floor). Upload uplinks are typically far slower, so a 300 MB floor there
  // would punish the user — upload just honours the time/stop budget.
  const floorBytes = direction === "up" ? 0 : MIN_SPEED_BYTES;
  const effectiveStopBytes = stopBytes
    ? Math.max(stopBytes, floorBytes)
    : null;
  let durationElapsed = false;

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  // The time budget is a soft target: it won't cut the run off until the byte
  // floor is met (otherwise sample() trips the abort once the floor is reached).
  const stopTimer = setTimeout(() => {
    durationElapsed = true;
    if (shared.bytes >= floorBytes) controller.abort();
  }, durationMs);

  // --- Per-second curve + live metrics. ---
  let emittedSeconds = 0;
  let bytesAtLastSecond = 0;
  let maxBps = 0;
  // Per-second throughput (bytes/sec) — the distribution behind the percentiles.
  const perSecBps: number[] = [];

  const sample = () => {
    const now = performance.now();
    const elapsed = (now - start) / 1000;

    let curve: SpeedProgress["curve"];
    while (Math.floor(elapsed) > emittedSeconds) {
      emittedSeconds += 1;
      const secondBytes = shared.bytes - bytesAtLastSecond;
      bytesAtLastSecond = shared.bytes;
      maxBps = Math.max(maxBps, secondBytes); // bytes in 1s == bytes/second
      perSecBps.push(secondBytes);
      curve = { t: emittedSeconds, mbps: Number(toMbps(secondBytes).toFixed(2)) };
    }

    const measuredSince = shared.firstByteAt ?? start;
    const measuredSec = (now - measuredSince) / 1000;
    const avgBps = measuredSec > 0 ? shared.bytes / measuredSec : 0;

    onProgress?.({
      t: Number(elapsed.toFixed(2)),
      avgBps,
      maxBps,
      bytes: shared.bytes,
      activeThreads: shared.activeThreads,
      latencyMs: shared.firstByteAt !== null ? shared.firstByteAt - start : undefined,
      curve,
    });

    if (effectiveStopBytes && shared.bytes >= effectiveStopBytes) controller.abort();
    else if (durationElapsed && shared.bytes >= floorBytes) controller.abort();
  };

  const ticker = setInterval(sample, sampleIntervalMs);

  try {
    const rampStep = ramp ? rampWindowMs / threadCount : 0;
    const worker = direction === "up"
      ? () => runUploadWorker(config.uploadUrl!, shared, controller.signal)
      : () => runWorker(config, shared, controller.signal);
    const workers = Array.from({ length: threadCount }, (_, i) =>
      sleep(rampStep * i, controller.signal).then(() =>
        controller.signal.aborted ? undefined : worker(),
      ),
    );
    const settled = await Promise.allSettled(workers);

    const allFailed =
      shared.bytes === 0 && settled.every((s) => s.status === "rejected");
    if (allFailed) {
      const reason = settled.find(
        (s): s is PromiseRejectedResult => s.status === "rejected",
      )?.reason;
      throw reason instanceof Error ? reason : new Error("测速失败");
    }
  } finally {
    clearTimeout(stopTimer);
    clearInterval(ticker);
    signal?.removeEventListener("abort", onAbort);
  }

  sample();

  const end = performance.now();
  const measuredSince = shared.firstByteAt ?? start;
  const durationMeasured = end - measuredSince;
  const avgBps = durationMeasured > 0 ? shared.bytes / (durationMeasured / 1000) : 0;

  const sortedBps = [...perSecBps].sort((a, b) => a - b);

  return {
    status: "done",
    threads: threadCount,
    ramp,
    latencyMs: shared.firstByteAt !== null ? shared.firstByteAt - start : undefined,
    durationMs: end - start,
    avgBps,
    maxBps: Math.max(maxBps, avgBps),
    bytes: shared.bytes,
    p25: sortedBps.length ? percentile(sortedBps, 25) : undefined,
    p50: sortedBps.length ? percentile(sortedBps, 50) : undefined,
    p95: sortedBps.length ? percentile(sortedBps, 95) : undefined,
  };
}

async function runWorker(config: SpeedConfig, shared: Shared, signal: AbortSignal): Promise<void> {
  // Each worker re-fetches the SAME url until the time/byte budget is hit. We do
  // NOT add a cache-buster: a unique query string forces an edge-cache MISS on
  // every request (Fastly/Cloudflare), which throttles throughput to the origin
  // pull instead of measuring the CDN. `cache: "no-store"` already stops the
  // browser from serving its own cached copy, so the same url is the fast path.
  const url =
    config.kind === "cloudflare"
      ? `${config.url}?bytes=${CLOUDFLARE_BYTES_PER_THREAD}`
      : config.url;
  while (!signal.aborted) {
    await streamOnce(url, shared, signal);
  }
}

/**
 * Upload worker: POSTs a fixed payload repeatedly via `fetch`. We deliberately
 * avoid XHR's `upload.onprogress` — registering an upload listener makes the
 * cross-origin POST non-simple and triggers a CORS preflight that
 * `speed.cloudflare.com/__up` rejects (400). With a plain simple POST we get no
 * mid-flight progress, so bytes are accounted per *completed* chunk; the headline
 * average (total bytes / elapsed) stays accurate, the live curve is just steppier.
 */
async function runUploadWorker(
  url: string,
  shared: Shared,
  signal: AbortSignal,
): Promise<void> {
  const body = getUploadBody();
  shared.activeThreads += 1;
  try {
    while (!signal.aborted) {
      try {
        await fetch(url, {
          method: "POST",
          body,
          mode: "cors",
          cache: "no-store",
          referrerPolicy: "strict-origin-when-cross-origin",
          signal,
        });
      } catch {
        if (signal.aborted) break;
        throw new Error("上行测速失败");
      }
      if (shared.firstByteAt === null) shared.firstByteAt = performance.now();
      shared.bytes += UPLOAD_CHUNK_BYTES;
    }
  } finally {
    shared.activeThreads -= 1;
  }
}

async function streamOnce(url: string, shared: Shared, signal: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      mode: "cors",
      // Force a referrer: Cloudflare's __down lifts its byte cap only when one
      // is present. The browser sends the origin by default, but an explicit
      // policy survives a deployment-level `Referrer-Policy: no-referrer`.
      referrerPolicy: "strict-origin-when-cross-origin",
      signal,
    });
  } catch (err) {
    if (signal.aborted) return;
    throw err;
  }
  if (!res.ok) throw new Error(`下载源返回 ${res.status}`);
  if (!res.body) throw new Error("当前环境不支持流式读取响应");

  const reader = res.body.getReader();
  shared.activeThreads += 1;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (shared.firstByteAt === null) shared.firstByteAt = performance.now();
      shared.bytes += value?.byteLength ?? 0;
    }
  } catch {
    // Aborted mid-stream — bytes already counted.
  } finally {
    shared.activeThreads -= 1;
  }
}