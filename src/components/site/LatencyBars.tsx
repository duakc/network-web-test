import { memo, useState } from "react";

import { cn } from "@/lib/utils";

interface LatencyBarsProps {
  /** Ordered samples; `null` = lost probe. */
  samples: (number | null)[];
  /** Total expected samples (drives placeholders + bucket boundaries). */
  total: number;
  /** Maximum number of bars rendered; larger runs are downsampled into this. */
  maxSlots?: number;
  className?: string;
}

/** Quality color thresholds: good (green) / fair (amber) / poor (red). */
export function latencyColorClass(ms: number): string {
  if (ms < 100) return "bg-success";
  if (ms < 250) return "bg-warning";
  return "bg-destructive";
}

interface Slot {
  lo: number; // 0-based inclusive
  hi: number; // 0-based exclusive
  state: "pending" | "loss" | "value";
  avg: number;
}

/**
 * Per-probe bars. When there are more samples than `maxSlots`, contiguous
 * blocks are averaged into one bar (e.g. 256 samples → 16 bars, each the mean
 * of 16). Bar height encodes latency, color encodes quality, and hovering shows
 * the underlying sample range and value.
 */
export const LatencyBars = memo(function LatencyBars({
  samples,
  total,
  maxSlots = 16,
  className,
}: LatencyBarsProps) {
  const [hover, setHover] = useState<{ i: number; text: string } | null>(null);

  const n = Math.max(total, samples.length, 1);
  const slots = Math.min(n, maxSlots);

  const ok = samples.filter((s): s is number => s !== null);
  const max = ok.length ? Math.max(...ok, 1) : 1;

  const buckets: Slot[] = Array.from({ length: slots }, (_, b) => {
    const lo = Math.floor((b * n) / slots);
    const hi = Math.max(lo + 1, Math.floor(((b + 1) * n) / slots));
    const arrived = samples.slice(lo, hi);
    const okVals = arrived.filter((s): s is number => s !== null);
    if (arrived.length === 0) return { lo, hi, state: "pending", avg: 0 };
    if (okVals.length === 0) return { lo, hi, state: "loss", avg: 0 };
    return { lo, hi, state: "value", avg: okVals.reduce((a, c) => a + c, 0) / okVals.length };
  });

  const label = (s: Slot) => {
    const range = s.hi - s.lo === 1 ? `${s.lo + 1}` : `${s.lo + 1}-${s.hi}`;
    if (s.state === "pending") return `${range}: 待测`;
    if (s.state === "loss") return `${range}: 丢包`;
    return `${range}: ${s.avg.toFixed(1)}ms`;
  };

  return (
    <div className={cn("relative", className)}>
      {hover && (
        <div
          className="pointer-events-none absolute -top-6 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background shadow"
          style={{ left: `${((hover.i + 0.5) / slots) * 100}%` }}
        >
          {hover.text}
        </div>
      )}
      <div className="flex h-9 items-end gap-px" onMouseLeave={() => setHover(null)}>
        {buckets.map((s, i) => (
          <div
            key={i}
            className="flex h-full flex-1 items-end"
            onMouseEnter={() => setHover({ i, text: label(s) })}
          >
            <div
              title={label(s)}
              className={cn(
                "w-full rounded-[1px] transition-all duration-300",
                s.state === "pending"
                  ? "h-1 bg-muted"
                  : s.state === "loss"
                    ? "h-full bg-muted-foreground/25"
                    : latencyColorClass(s.avg),
                hover?.i === i && s.state === "value" && "ring-1 ring-foreground/30",
              )}
              style={s.state === "value" ? { height: `${Math.max(10, (s.avg / max) * 100)}%` } : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
});