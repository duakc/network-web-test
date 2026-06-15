import { useEffect } from "react";
import {
  Activity as ActivityIcon,
  ArrowDown,
  ArrowUp,
  Clock,
  Download,
  Gauge,
  LineChart as LineChartIcon,
  Loader2,
  RotateCw,
  Square,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LatencyBars } from "@/components/site/LatencyBars";
import { MonitorBars } from "@/components/activity/MonitorBars";
import { SpeedChart } from "@/components/speed/SpeedChart";
import { formatBytes, formatMs, formatSeconds, formatSpeed } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Activity, NetworkTarget, SpeedDirection } from "@/types";

interface ActivityFeedProps {
  activities: Activity[];
  /** When this id changes, scroll the matching entry into view. */
  focusId?: string | null;
  /** Stop a single running activity (without removing it). */
  onStopActivity: (id: string) => void;
  onRemove: (id: string) => void;
  /** Remove all finished (non-running, non-queued) activities. */
  onClearInactive: () => void;
  /** Queue another speed test (for side-by-side comparison). */
  onRetest: (target: NetworkTarget, direction: SpeedDirection) => void;
}

/** The right-column feed: every test appends an entry, newest first. */
export function ActivityFeed({
  activities,
  focusId,
  onStopActivity,
  onRemove,
  onClearInactive,
  onRetest,
}: ActivityFeedProps) {
  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      document
        .getElementById(`activity-${focusId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
    return () => clearTimeout(t);
  }, [focusId]);

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Gauge className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">暂无测试活动</p>
            <p className="text-xs text-muted-foreground">
              测速、长期监测、或大次数延迟测试的结果会按时间顺序显示在这里
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const clearableCount = activities.filter(
    (a) => !a.running && !(a.kind === "speed" && a.result.status === "queued"),
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          活动 ({activities.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-muted-foreground hover:text-destructive"
          onClick={onClearInactive}
          disabled={clearableCount === 0}
          title="清理所有已结束的活动"
        >
          <Trash2 className="size-3.5" />
          清理 ({clearableCount})
        </Button>
      </div>
      {activities.map((activity) => {
        if (activity.kind === "speed")
          return (
            <SpeedActivity
              key={activity.id}
              activity={activity}
              onStop={onStopActivity}
              onRemove={onRemove}
              onRetest={onRetest}
            />
          );
        if (activity.kind === "monitor")
          return (
            <MonitorActivity
              key={activity.id}
              activity={activity}
              onStop={onStopActivity}
              onRemove={onRemove}
            />
          );
        return (
          <LatencyActivity
            key={activity.id}
            activity={activity}
            onStop={onStopActivity}
            onRemove={onRemove}
          />
        );
      })}
    </div>
  );
}

function ActivityHeader({
  icon,
  name,
  badge,
  onClose,
}: {
  icon: React.ReactNode;
  name: string;
  badge: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <span className="truncate font-medium">{name}</span>
      {badge}
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto size-7 shrink-0 text-muted-foreground"
        onClick={onClose}
        aria-label="移除"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

function SpeedActivity({
  activity,
  onStop,
  onRemove,
  onRetest,
}: {
  activity: Extract<Activity, { kind: "speed" }>;
  onStop: (id: string) => void;
  onRemove: (id: string) => void;
  onRetest: (target: NetworkTarget, direction: SpeedDirection) => void;
}) {
  const { running, result, live, samples, target, direction } = activity;
  const queued = result.status === "queued";
  const avgBps = running ? live?.avgBps : result.avgBps;
  const maxBps = running ? live?.maxBps : result.maxBps;
  const bytes = running ? live?.bytes : result.bytes;
  const latencyMs = running ? live?.latencyMs : result.latencyMs;
  const elapsedMs = running ? (live?.t ?? 0) * 1000 : result.durationMs;
  const dirLabel = direction === "up" ? "上行" : "下行";
  const DirIcon = direction === "up" ? ArrowUp : ArrowDown;
  // Re-test offered once the run is settled (done or errored), for comparison.
  const settled = !queued && !running;
  const canUpload = !!target.speed?.uploadUrl;
  // The other direction to offer alongside "重新测速" (which repeats this run's).
  const otherDir: SpeedDirection = direction === "up" ? "down" : "up";
  const otherLabel = otherDir === "up" ? "上行测速" : "下行测速";
  const OtherIcon = otherDir === "up" ? ArrowUp : ArrowDown;
  const otherDisabled = otherDir === "up" && !canUpload;
  const hasPct =
    result.status === "done" &&
    [result.p25, result.p50, result.p95].every((v) => typeof v === "number");

  return (
    <Card id={`activity-${activity.id}`} className={cn(queued && "opacity-70")}>
      <CardContent className="space-y-4 py-4">
        <ActivityHeader
          icon={<Gauge className="size-4" />}
          name={target.name}
          badge={
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="gap-0.5">
                <DirIcon className="size-3" />
                {dirLabel}
              </Badge>
              {queued ? (
                <Badge variant="muted">排队中</Badge>
              ) : running ? (
                <Badge variant="default" className="gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  {result.threads} 线程{result.ramp ? " · 渐进" : ""}
                  {live ? ` · ${live.activeThreads} 活跃` : ""}
                </Badge>
              ) : result.status === "error" ? (
                <Badge variant="destructive">失败</Badge>
              ) : (
                <Badge variant="muted">
                  {result.threads} 线程{result.ramp ? " · 渐进" : ""}
                </Badge>
              )}
            </span>
          }
          onClose={() => onRemove(activity.id)}
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric icon={<Gauge className="size-3.5" />} label="平均" value={avgBps ? formatSpeed(avgBps) : "—"} highlight />
          <Metric icon={<TrendingUp className="size-3.5" />} label="最大" value={maxBps ? formatSpeed(maxBps) : "—"} />
          <Metric icon={<Download className="size-3.5" />} label="流量" value={bytes ? formatBytes(bytes) : "—"} />
          <Metric icon={<Clock className="size-3.5" />} label="首字节延迟" value={typeof latencyMs === "number" ? formatMs(latencyMs) : "—"} />
        </div>

        {!queued && <SpeedChart samples={samples} />}

        {/* Per-second throughput distribution (settled runs only). */}
        {hasPct && (
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="25th" value={formatSpeed(result.p25!)} />
            <MiniStat label="50th" value={formatSpeed(result.p50!)} />
            <MiniStat label="95th" value={formatSpeed(result.p95!)} />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{queued ? "等待前一个测速完成…" : `用时 ${elapsedMs ? formatSeconds(elapsedMs) : "—"} · 曲线为每秒平均`}</span>
          {result.status === "error" && !canUpload && direction === "up" ? null : result.status === "error" ? (
            <span className="text-destructive">{result.error}</span>
          ) : null}
        </div>

        {/* Stop keeps the partial result on screen (X would discard it). */}
        {running && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => onStop(activity.id)}>
            <Square className="fill-current" />
            停止
          </Button>
        )}

        {/* Re-test repeats this run's direction; the other button switches direction.
            Both keep this result and queue a fresh one for comparison. */}
        {settled && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onRetest(target, direction)}>
              <RotateCw />
              重新测速
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetest(target, otherDir)}
              disabled={otherDisabled}
              title={otherDisabled ? "该网站不支持上行测速" : otherLabel}
            >
              <OtherIcon />
              {otherLabel}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LatencyActivity({
  activity,
  onStop,
  onRemove,
}: {
  activity: Extract<Activity, { kind: "latency" }>;
  onStop: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { running, result, target } = activity;
  const done = result.status === "done";

  return (
    <Card id={`activity-${activity.id}`}>
      <CardContent className="space-y-3 py-4">
        <ActivityHeader
          icon={<ActivityIcon className="size-4" />}
          name={`${target.name} · 延迟测试`}
          badge={
            running ? (
              <Badge variant="default" className="gap-1">
                <Loader2 className="size-3 animate-spin" />
                {result.samples.length} 次
              </Badge>
            ) : (
              <Badge variant="muted">{result.samples.length} 次</Badge>
            )
          }
          onClose={() => onRemove(activity.id)}
        />

        <LatencyBars samples={result.samples} notes={result.notes} total={result.samples.length} maxSlots={64} />

        {done && (
          <div className="grid grid-cols-5 gap-2">
            <MiniStat label="最小" value={formatMs(result.min!, 0)} />
            <MiniStat label="平均" value={formatMs(result.avg!, 0)} />
            <MiniStat label="最大" value={formatMs(result.max!, 0)} />
            <MiniStat label="抖动" value={formatMs(result.jitter ?? 0, 0)} />
            <MiniStat label="丢包" value={`${Math.round((result.loss ?? 0) * 100)}%`} />
          </div>
        )}

        {/* Percentiles: only meaningful on large runs (>16 probes). */}
        {done && result.samples.length > 16 && Number.isFinite(result.p50) && (
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="25th" value={formatMs(result.p25!, 0)} />
            <MiniStat label="50th" value={formatMs(result.p50!, 0)} />
            <MiniStat label="95th" value={formatMs(result.p95!, 0)} />
          </div>
        )}

        {running && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => onStop(activity.id)}>
            <Square className="fill-current" />
            停止
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MonitorActivity({
  activity,
  onStop,
  onRemove,
}: {
  activity: Extract<Activity, { kind: "monitor" }>;
  onStop: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { running, points, stats, target } = activity;
  const durationS = points.length ? points[points.length - 1].t : 0;

  return (
    <Card id={`activity-${activity.id}`}>
      <CardContent className="space-y-3 py-4">
        <ActivityHeader
          icon={<LineChartIcon className="size-4" />}
          name={`${target.name} · 长期监测`}
          badge={
            running ? (
              <Badge variant="default" className="gap-1">
                <Loader2 className="size-3 animate-spin" />
                监测中
              </Badge>
            ) : (
              <Badge variant="muted">已停止</Badge>
            )
          }
          onClose={() => onRemove(activity.id)}
        />

        <MonitorBars points={points} running={running} />

        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="最小" value={typeof stats.min === "number" ? formatMs(stats.min, 0) : "—"} />
          <MiniStat label="平均" value={typeof stats.avg === "number" ? formatMs(stats.avg, 0) : "—"} />
          <MiniStat label="最大" value={typeof stats.max === "number" ? formatMs(stats.max, 0) : "—"} />
          <MiniStat label="抖动" value={formatMs(stats.jitter ?? 0, 0)} />
        </div>
        {typeof stats.p50 === "number" && Number.isFinite(stats.p50) && (
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="25th" value={formatMs(stats.p25!, 0)} />
            <MiniStat label="50th" value={formatMs(stats.p50!, 0)} />
            <MiniStat label="95th" value={formatMs(stats.p95!, 0)} />
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="时长" value={formatSeconds(durationS * 1000)} />
          <MiniStat label="样本" value={String(stats.count)} />
          <MiniStat label="丢包" value={`${Math.round(stats.loss * 100)}%`} />
        </div>

        {running && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => onStop(activity.id)}>
            <Square className="fill-current" />
            停止监测
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-2.5", highlight ? "border-primary/30 bg-primary/5" : "bg-card")}>
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-sm font-semibold tabular-nums", highlight && "text-primary")}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2 text-center">
      <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}