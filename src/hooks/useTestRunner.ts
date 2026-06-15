import { useCallback, useEffect, useRef, useState } from "react";

import { measureLatency, percentile } from "@/lib/network/latency";
import { runSpeedTest } from "@/lib/network/speed";
import type {
  Activity,
  LatencyResult,
  MonitorPoint,
  MonitorStats,
  NetworkTarget,
  ProbeNote,
  SpeedDirection,
  TestSettings,
} from "@/types";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
  });
}

function monitorStats(points: MonitorPoint[]): MonitorStats {
  const ok = points.map((p) => p.ms).filter((m): m is number => m !== null);
  const sorted = [...ok].sort((a, b) => a - b);
  let jitter = 0;
  for (let i = 1; i < ok.length; i++) jitter += Math.abs(ok[i] - ok[i - 1]);
  return {
    count: points.length,
    min: ok.length ? Math.min(...ok) : undefined,
    max: ok.length ? Math.max(...ok) : undefined,
    avg: ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : undefined,
    jitter: ok.length > 1 ? jitter / (ok.length - 1) : 0,
    loss: points.length ? (points.length - ok.length) / points.length : 0,
    p25: ok.length ? percentile(sorted, 25) : undefined,
    p50: ok.length ? percentile(sorted, 50) : undefined,
    p95: ok.length ? percentile(sorted, 95) : undefined,
  };
}

const MAX_MONITOR_POINTS = 600;

/**
 * Central test coordinator.
 *  - Latency tests run **concurrently** (each target independent), so they can
 *    run alongside a speed test to reveal load-induced latency.
 *  - Speed tests are serialized: only one runs at a time; extra requests queue.
 *  - Long-term monitors run independently.
 *  - Every speed/monitor run owns an AbortController keyed by activity id, so
 *    removing its feed entry actually stops the work.
 */
export function useTestRunner(settings: TestSettings) {
  const [latencyResults, setLatencyResults] = useState<Record<string, LatencyResult>>({});
  const [activities, setActivities] = useState<Activity[]>([]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const latencyControllers = useRef(new Map<string, AbortController>());
  const activityControllers = useRef(new Map<string, AbortController>());
  const speedActive = useRef(false);
  const speedQueue = useRef<
    { id: string; target: NetworkTarget; direction: SpeedDirection }[]
  >([]);
  const idCounter = useRef(0);

  const nextId = () => `act-${++idCounter.current}`;
  const updateActivity = (id: string, fn: (a: Activity) => Activity) =>
    setActivities((prev) => prev.map((a) => (a.id === id ? fn(a) : a)));

  useEffect(() => {
    const lat = latencyControllers.current;
    const act = activityControllers.current;
    return () => {
      lat.forEach((c) => c.abort());
      act.forEach((c) => c.abort());
    };
  }, []);

  // --- Latency (concurrent) ---
  const runLatencyOne = useCallback((target: NetworkTarget) => {
    latencyControllers.current.get(target.id)?.abort();
    const c = new AbortController();
    latencyControllers.current.set(target.id, c);

    // Large runs (>16 probes) are too detailed for the small card, so they are
    // also surfaced in the activity feed (and can be removed/stopped there).
    const logToFeed = settingsRef.current.latencyCount > 16;
    const activityId = logToFeed ? nextId() : null;
    if (activityId) {
      activityControllers.current.set(activityId, c);
      setActivities((prev) => [
        {
          id: activityId,
          kind: "latency",
          target,
          running: true,
          result: { targetId: target.id, status: "running", samples: [] },
        },
        ...prev,
      ]);
    }

    const ordered: (number | null)[] = [];
    const orderedNotes: (ProbeNote | null)[] = [];
    // The card (16-slot bars) only needs to repaint when a whole bucket fills;
    // the activity feed (64-slot bars) animates per probe. So they update at
    // different cadences — see `onSample` below.
    const pushCard = (r: LatencyResult) =>
      setLatencyResults((prev) => ({ ...prev, [target.id]: r }));
    const pushFeed = (r: LatencyResult) => {
      if (activityId) {
        updateActivity(activityId, (a) =>
          a.kind === "latency" ? { ...a, running: r.status === "running", result: r } : a,
        );
      }
    };
    const setBoth = (r: LatencyResult) => {
      pushCard(r);
      pushFeed(r);
    };

    setBoth({ targetId: target.id, status: "running", samples: [] });

    // The card's bars summarize into ≤16 blocks, so on large runs it only needs
    // to repaint once per block (`step` probes). The activity feed shows every
    // probe (synchronously, one sample = one update). The final result is always
    // flushed to both by `.then` below.
    const count = settingsRef.current.latencyCount;
    const step = Math.max(1, Math.floor(count / 16));

    measureLatency(target.latencyUrl, {
      count,
      probe: target.latency,
      signal: c.signal,
      onSample: (rtt, note) => {
        ordered.push(rtt);
        orderedNotes.push(note);
        const r: LatencyResult = {
          targetId: target.id,
          status: "running",
          samples: [...ordered],
          notes: [...orderedNotes],
        };
        pushFeed(r); // per-probe: keep the feed's fine-grained bars in sync
        if (ordered.length % step === 0 || ordered.length === count) {
          pushCard(r); // per-bucket: only repaint the card when a block completes
        }
      },
    })
      .then((stats) => {
        if (latencyControllers.current.get(target.id) !== c) return;
        const ok = stats.samples.some((s) => s !== null);
        setBoth({
          targetId: target.id,
          status: ok ? "done" : "error",
          samples: stats.samples,
          notes: stats.notes,
          min: stats.min,
          max: stats.max,
          avg: stats.avg,
          jitter: stats.jitter,
          loss: stats.loss,
          p25: stats.p25,
          p50: stats.p50,
          p95: stats.p95,
        });
      })
      .catch(() => {
        if (latencyControllers.current.get(target.id) !== c) return;
        setBoth({ targetId: target.id, status: "error", samples: ordered, notes: orderedNotes });
      })
      .finally(() => {
        if (latencyControllers.current.get(target.id) === c) {
          latencyControllers.current.delete(target.id);
        }
        if (activityId) activityControllers.current.delete(activityId);
      });
  }, []);

  const testLatency = useCallback(
    (targets: NetworkTarget[]) => targets.forEach(runLatencyOne),
    [runLatencyOne],
  );

  const autoEnqueue = useCallback(
    (target: NetworkTarget) => {
      if (latencyControllers.current.has(target.id)) return;
      runLatencyOne(target);
    },
    [runLatencyOne],
  );

  // --- Speed (single, queued) ---
  const processSpeedQueue = useCallback(() => {
    if (speedActive.current) return;
    const job = speedQueue.current.shift();
    if (!job) return;
    speedActive.current = true;

    const c = new AbortController();
    activityControllers.current.set(job.id, c);
    const s = settingsRef.current;

    updateActivity(job.id, (a) =>
      a.kind === "speed"
        ? { ...a, running: true, result: { status: "running", threads: s.speedThreads, ramp: s.speedRamp } }
        : a,
    );

    // Time and traffic limits are mutually exclusive. In "data" mode the timer
    // is pushed far out so only the byte cap stops the run; in "time" mode there
    // is no byte cap (the engine's 300 MiB floor still applies to downloads).
    const dataMode = s.speedLimitMode === "data";
    runSpeedTest(job.target.speed!, {
      threads: s.speedThreads,
      durationMs: dataMode ? 24 * 60 * 60 * 1000 : s.speedDurationMs,
      stopBytes: dataMode ? Math.max(300, s.speedStopMB ?? 300) * 1024 * 1024 : null,
      ramp: s.speedRamp,
      // Ramp pacing follows the configured duration even when the byte cap (not
      // time) is what actually stops the run.
      rampWindowMs: s.speedDurationMs,
      direction: job.direction,
      signal: c.signal,
      onProgress: (p) =>
        updateActivity(job.id, (a) =>
          a.kind === "speed"
            ? { ...a, live: p, samples: p.curve ? [...a.samples, p.curve] : a.samples }
            : a,
        ),
    })
      .then((result) =>
        updateActivity(job.id, (a) => (a.kind === "speed" ? { ...a, running: false, result } : a)),
      )
      .catch((err: unknown) => {
        if (c.signal.aborted) {
          updateActivity(job.id, (a) => ({ ...a, running: false }));
          return;
        }
        updateActivity(job.id, (a) =>
          a.kind === "speed"
            ? {
                ...a,
                running: false,
                result: { status: "error", error: err instanceof Error ? err.message : "测速失败" },
              }
            : a,
        );
      })
      .finally(() => {
        activityControllers.current.delete(job.id);
        speedActive.current = false;
        processSpeedQueue();
      });
  }, []);

  const testSpeed = useCallback(
    (targets: NetworkTarget[], direction: SpeedDirection = "down") => {
      const list = targets.filter((t) => t.speed);
      if (!list.length) return;
      const s = settingsRef.current;
      const jobs = list.map((target) => ({
        id: nextId(),
        target,
        direction,
        // Upload needs an uploadUrl; otherwise the entry shows an error.
        supported: direction === "down" || !!target.speed!.uploadUrl,
      }));
      setActivities((prev) => [
        ...jobs
          .map<Activity>((job) => ({
            id: job.id,
            kind: "speed",
            target: job.target,
            running: false,
            direction: job.direction,
            result: job.supported
              ? { status: "queued", threads: s.speedThreads, ramp: s.speedRamp }
              : { status: "error", error: "该网站不支持上行测速" },
            samples: [],
            live: null,
          }))
          .reverse(),
        ...prev,
      ]);
      speedQueue.current.push(
        ...jobs.filter((j) => j.supported).map(({ id, target, direction }) => ({ id, target, direction })),
      );
      processSpeedQueue();
    },
    [processSpeedQueue],
  );

  // --- Long-term monitor (independent) ---
  const startMonitor = useCallback(async (target: NetworkTarget) => {
    const id = nextId();
    const c = new AbortController();
    activityControllers.current.set(id, c);

    const startedAt = performance.now();
    const points: MonitorPoint[] = [];
    setActivities((prev) => [
      { id, kind: "monitor", target, running: true, points: [], stats: monitorStats([]), startedAt },
      ...prev,
    ]);

    try {
      await measureLatency(target.latencyUrl, {
        count: 1,
        probe: target.latency,
        signal: c.signal,
      });
      while (!c.signal.aborted) {
        const stats = await measureLatency(target.latencyUrl, {
          count: 3,
          skipWarmup: true,
          probe: target.latency,
          signal: c.signal,
        });
        if (c.signal.aborted) break;
        const ms = Number.isNaN(stats.avg) ? null : Number(stats.avg.toFixed(1));
        points.push({ t: Number(((performance.now() - startedAt) / 1000).toFixed(1)), ms });
        if (points.length > MAX_MONITOR_POINTS) points.shift();
        const snapshot = [...points];
        updateActivity(id, (a) =>
          a.kind === "monitor" ? { ...a, points: snapshot, stats: monitorStats(snapshot) } : a,
        );
        await sleep(settingsRef.current.monitorIntervalMs, c.signal);
      }
    } finally {
      updateActivity(id, (a) => ({ ...a, running: false }));
      activityControllers.current.delete(id);
    }
  }, []);

  const removeActivity = useCallback(
    (id: string) => {
      activityControllers.current.get(id)?.abort();
      speedQueue.current = speedQueue.current.filter((j) => j.id !== id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
    },
    [],
  );

  /** Abort a running activity (speed/monitor/latency) without removing it. */
  const abortActivity = useCallback((id: string) => {
    activityControllers.current.get(id)?.abort();
    speedQueue.current = speedQueue.current.filter((j) => j.id !== id);
  }, []);

  /** Remove every finished activity (keeps running ones and queued speed). */
  const clearInactive = useCallback(() => {
    setActivities((prev) =>
      prev.filter(
        (a) => a.running || (a.kind === "speed" && a.result.status === "queued"),
      ),
    );
  }, []);

  const stopAll = useCallback(() => {
    latencyControllers.current.forEach((c) => c.abort());
    activityControllers.current.forEach((c) => c.abort());
    speedQueue.current = [];
    speedActive.current = false;
    // Drop queued speed entries; mark running ones stopped.
    setActivities((prev) =>
      prev
        .filter((a) => !(a.kind === "speed" && a.result.status === "queued"))
        .map((a) => ({ ...a, running: false })),
    );
  }, []);

  return {
    latencyResults,
    activities,
    testLatency,
    testSpeed,
    startMonitor,
    autoEnqueue,
    removeActivity,
    abortActivity,
    clearInactive,
    stopAll,
  };
}