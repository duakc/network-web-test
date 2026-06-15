import { latencyColorClass } from "@/components/site/LatencyBars";
import { cn } from "@/lib/utils";
import type { MonitorPoint } from "@/types";

/** Target number of bars to fill before the strip starts scrolling. */
const WINDOW = 64;

/**
 * Long-term monitor strip. Unlike the card bars (which downsample), this keeps
 * one bar per probe:
 *  - While running with few points, it shows `WINDOW` slots that fill in one by
 *    one (fixed bar width, like the cards).
 *  - Once stopped, the points stretch to fill the width.
 *  - When there are more points than fit, each bar keeps a min width and the
 *    strip scrolls horizontally.
 */
export function MonitorBars({
  points,
  running,
}: {
  points: MonitorPoint[];
  running: boolean;
}) {
  const ok = points
    .map((p) => p.ms)
    .filter((m): m is number => m !== null);
  const max = ok.length ? Math.max(...ok, 1) : 1;

  const slots = running ? Math.max(WINDOW, points.length) : Math.max(points.length, 1);

  return (
    <div className="no-scrollbar overflow-x-auto">
      <div className="flex h-14 items-end gap-px" style={{ minWidth: "100%" }}>
        {Array.from({ length: slots }).map((_, i) => {
          const p = points[i];
          if (!p) {
            // Pending slot (only while running and not yet filled).
            return <div key={i} className="h-1 min-w-[5px] flex-1 rounded-[1px] bg-muted" />;
          }
          if (p.ms === null) {
            return (
              <div
                key={i}
                title={`${p.t}s：丢包`}
                className="h-full min-w-[5px] flex-1 rounded-[1px] bg-muted-foreground/25"
              />
            );
          }
          return (
            <div
              key={i}
              title={`${p.t}s：${p.ms.toFixed(1)}ms`}
              className={cn(
                "min-w-[5px] flex-1 rounded-[1px] transition-all duration-150 hover:opacity-70",
                latencyColorClass(p.ms),
              )}
              style={{ height: `${Math.max(8, (p.ms / max) * 100)}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}