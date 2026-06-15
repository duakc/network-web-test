import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Cloud,
  Gauge,
  LineChart,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useInView } from "@/hooks/useInView";
import { hostOf } from "@/lib/network/site";
import { cn } from "@/lib/utils";
import type { LatencyResult, NetworkTarget } from "@/types";

import { LatencyBars } from "./LatencyBars";

interface SiteCardProps {
  target: NetworkTarget;
  result?: LatencyResult;
  latencyCount: number;
  autoTest: boolean;
  speedRunning: boolean;
  monitoring: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onTestLatency: () => void;
  onAutoTest: () => void;
  onTestSpeed?: () => void;
  onMonitor: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

/** Compact site tile: header, per-probe bars, then summary + actions. */
export function SiteCard({
  target,
  result,
  latencyCount,
  autoTest,
  speedRunning,
  monitoring,
  selected,
  onToggleSelect,
  onTestLatency,
  onAutoTest,
  onTestSpeed,
  onMonitor,
  onEdit,
  onRemove,
}: SiteCardProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const triggered = useRef(false);
  const status = result?.status ?? "idle";
  const latencyRunning = status === "running";

  useEffect(() => {
    if (!autoTest || !inView || triggered.current) return;
    triggered.current = true;
    if (status === "idle") onAutoTest();
  }, [autoTest, inView, status, onAutoTest]);

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card p-2.5 transition-colors",
        selected ? "border-primary/50 bg-primary/[0.03]" : "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label={`选择 ${target.name}`} />
        <Favicon target={target} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{target.name}</span>
            {target.cloudflare && <Cloud className="size-3 shrink-0 text-primary" aria-label="Cloudflare 边缘" />}
            <span className="ml-auto shrink-0 truncate pl-1 text-[11px] text-muted-foreground">
              {hostOf(target.latencyUrl)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {target.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2.5">
        {/* Tested cards key their bars off their OWN sample count, so changing
            the global count setting never re-lays-out an existing result. */}
        <LatencyBars
          samples={result?.samples ?? []}
          total={
            status === "done" || status === "error"
              ? Math.max(result?.samples.length ?? 1, 1)
              : latencyCount
          }
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="min-w-0 flex-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          <SummaryLine status={status} result={result} count={latencyCount} />
        </div>
        <div className="flex shrink-0 items-center">
          <IconAction label="测延迟" icon={<Activity className="size-3.5" />} onClick={onTestLatency} disabled={latencyRunning} loading={latencyRunning} />
          {target.speed && (
            <IconAction label="测速" icon={<Gauge className="size-3.5" />} onClick={onTestSpeed} loading={speedRunning} />
          )}
          <IconAction label="长期监测" icon={<LineChart className="size-3.5" />} onClick={onMonitor} loading={monitoring} />
          {onEdit && <IconAction label="编辑" icon={<Pencil className="size-3.5" />} onClick={onEdit} />}
          {onRemove && <IconAction label="删除" icon={<Trash2 className="size-3.5" />} onClick={onRemove} danger />}
        </div>
      </div>
    </div>
  );
}

/**
 * Before a run, this is a hint showing the metric *names*. After a run it
 * becomes the latency *values* (hover a value to see which metric it is).
 */
function SummaryLine({
  status,
  result,
  count,
}: {
  status: LatencyResult["status"];
  result?: LatencyResult;
  count: number;
}) {
  if (status === "done" && result) {
    const metrics: { name: string; value: string; accent?: boolean }[] = [
      { name: "最小延迟 (ms)", value: String(Math.round(result.min!)) },
      { name: "最大延迟 (ms)", value: String(Math.round(result.max!)) },
      { name: "平均延迟 (ms)", value: String(Math.round(result.avg!)), accent: true },
      { name: "抖动 (ms)", value: String(Math.round(result.jitter ?? 0)) },
      { name: "丢包率", value: `${Math.round((result.loss ?? 0) * 100)}%` },
    ];
    // Floating (justify-between) layout, single line, tiny font so even
    // four-digit values fit without wrapping. Values are selectable (so they
    // can be copied); a CSS tooltip reveals each metric's name on hover.
    return (
      <span className="flex w-full justify-between gap-1 whitespace-nowrap text-[10px] leading-none">
        {metrics.map((m) => (
          <span key={m.name} className="group relative">
            <span className={cn("cursor-text select-text", m.accent && "font-semibold text-foreground")}>
              {m.value}
            </span>
            <span className="pointer-events-none absolute -top-5 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background shadow group-hover:block">
              {m.name}
            </span>
          </span>
        ))}
      </span>
    );
  }
  if (status === "running") {
    return <span>测试中 {result?.samples.length ?? 0}/{count}…</span>;
  }
  if (status === "error") return <span className="text-destructive">测试失败</span>;
  // Idle hint: the metric names that get filled in after testing.
  return (
    <span className="flex w-full justify-between gap-1 whitespace-nowrap text-[10px] leading-none text-muted-foreground/70">
      <span>min</span>
      <span>max</span>
      <span>avg</span>
      <span>jitter</span>
      <span>drop</span>
    </span>
  );
}

function IconAction({
  label,
  icon,
  onClick,
  disabled,
  loading,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-7 text-muted-foreground hover:text-foreground",
        danger && "hover:text-destructive",
        loading && "text-primary",
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : icon}
    </Button>
  );
}

function Favicon({ target }: { target: NetworkTarget }) {
  const [failed, setFailed] = useState(false);
  if (failed || !target.icon) {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground">
        {target.name.charAt(0)}
      </div>
    );
  }
  return (
    <img
      src={target.icon}
      alt=""
      width={36}
      height={36}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-9 shrink-0 rounded object-contain"
    />
  );
}