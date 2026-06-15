import { toMbps } from "@/lib/format";
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
  /** "down" streams a payload in; "up" POSTs a payload out (needs uploadUrl). */
  direction?: "down" | "up";
  onProgress?: (progress: SpeedProgress) => void;
  sampleIntervalMs?: number;
  signal?: AbortSignal;
}

const CLOUDFLARE_BYTES_PER_THREAD = 300 * 1024 * 1024;
/** Per-request upload payload (reused across requests/threads). */
const UPLOAD_CHUNK_BYTES = 16 * 1024 * 1024;
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

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const stopTimer = setTimeout(() => controller.abort(), durationMs);

  // Upload uses XHR (for upload progress); abort must tear those down too.
  const liveXhrs = new Set<XMLHttpRequest>();
  controller.signal.addEventListener("abort", () => liveXhrs.forEach((x) => x.abort()), {
    once: true,
  });

  // --- Per-second curve + live metrics. ---
  let emittedSeconds = 0;
  let bytesAtLastSecond = 0;
  let maxBps = 0;

  const sample = () => {
    const now = performance.now();
    const elapsed = (now - start) / 1000;

    let curve: SpeedProgress["curve"];
    while (Math.floor(elapsed) > emittedSeconds) {
      emittedSeconds += 1;
      const secondBytes = shared.bytes - bytesAtLastSecond;
      bytesAtLastSecond = shared.bytes;
      maxBps = Math.max(maxBps, secondBytes); // bytes in 1s == bytes/second
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

    if (stopBytes && shared.bytes >= stopBytes) controller.abort();
  };

  const ticker = setInterval(sample, sampleIntervalMs);

  try {
    const rampStep = ramp ? durationMs / threadCount : 0;
    const worker = direction === "up"
      ? () => runUploadWorker(config.uploadUrl!, shared, controller.signal, liveXhrs)
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

  return {
    status: "done",
    threads: threadCount,
    ramp,
    latencyMs: shared.firstByteAt !== null ? shared.firstByteAt - start : undefined,
    durationMs: end - start,
    avgBps,
    maxBps: Math.max(maxBps, avgBps),
    bytes: shared.bytes,
  };
}

async function runWorker(config: SpeedConfig, shared: Shared, signal: AbortSignal): Promise<void> {
  if (config.kind === "cloudflare") {
    await streamOnce(`${config.url}?bytes=${CLOUDFLARE_BYTES_PER_THREAD}`, shared, signal);
    return;
  }
  while (!signal.aborted) {
    const url = `${config.url}${config.url.includes("?") ? "&" : "?"}_=${performance.now()}`;
    await streamOnce(url, shared, signal);
  }
}

/**
 * Upload worker: POSTs a fixed payload repeatedly via XHR so we can read
 * `upload.onprogress` (fetch gives no upload progress). Bytes are folded into
 * the shared counter exactly like the download path.
 */
async function runUploadWorker(
  url: string,
  shared: Shared,
  signal: AbortSignal,
  liveXhrs: Set<XMLHttpRequest>,
): Promise<void> {
  const body = getUploadBody();
  shared.activeThreads += 1;
  try {
    while (!signal.aborted) {
      await new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        liveXhrs.add(xhr);
        let last = 0;
        xhr.open("POST", `${url}${url.includes("?") ? "&" : "?"}_=${performance.now()}`);
        xhr.upload.onprogress = (e) => {
          if (shared.firstByteAt === null) shared.firstByteAt = performance.now();
          shared.bytes += e.loaded - last;
          last = e.loaded;
        };
        xhr.onloadend = () => {
          liveXhrs.delete(xhr);
          resolve();
        };
        try {
          xhr.send(body);
        } catch {
          liveXhrs.delete(xhr);
          resolve();
        }
      });
    }
  } finally {
    shared.activeThreads -= 1;
  }
}

async function streamOnce(url: string, shared: Shared, signal: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal });
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