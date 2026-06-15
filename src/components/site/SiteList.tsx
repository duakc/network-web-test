import { useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowDownNarrowWide,
  ArrowUp,
  CheckSquare,
  ChevronRight,
  Gauge,
  Plus,
  RotateCcw,
  Square,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TAG_ORDER, type SiteTag } from "@/config/tags";
import { useFlipReorder } from "@/hooks/useFlipReorder";
import { useTargets } from "@/hooks/useTargets";
import { cn } from "@/lib/utils";
import type {
  Activity as ActivityItem,
  LatencyResult,
  NetworkTarget,
  SpeedDirection,
} from "@/types";

import { AddTargetForm } from "./AddTargetForm";
import { SiteCard } from "./SiteCard";

interface SiteListProps {
  latencyResults: Record<string, LatencyResult>;
  activities: ActivityItem[];
  latencyCount: number;
  onTestLatency: (targets: NetworkTarget[]) => void;
  onAutoEnqueue: (target: NetworkTarget) => void;
  onTestSpeed: (targets: NetworkTarget[], direction: SpeedDirection) => void;
  onAbortActivity: (id: string) => void;
  onMonitor: (target: NetworkTarget) => void;
  onStopAll: () => void;
}

export function SiteList({
  latencyResults,
  activities,
  latencyCount,
  onTestLatency,
  onAutoEnqueue,
  onTestSpeed,
  onAbortActivity,
  onMonitor,
  onStopAll,
}: SiteListProps) {
  const { targets, customCount, hiddenCount, upsert, remove, clearCustom, restoreHidden } =
    useTargets();
  const [autoTest, setAutoTest] = useState(false);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<SiteTag | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NetworkTarget | null>(null);
  const [grouped, setGrouped] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<SiteTag>>(new Set());
  const [direction, setDirection] = useState<SpeedDirection>("down");

  // Tags actually present, in canonical order, for the quick-filter chips.
  const availableTags = useMemo(() => {
    const present = new Set<SiteTag>();
    targets.forEach((t) => t.tags.forEach((tag) => present.add(tag)));
    return TAG_ORDER.filter((t) => present.has(t));
  }, [targets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return targets.filter((t) => {
      if (tagFilter && !t.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [targets, query, tagFilter]);

  // Order is NOT recomputed automatically when tests finish. The user applies a
  // latency sort by clicking the sort button, which freezes an explicit order.
  const [sortedIds, setSortedIds] = useState<string[] | null>(null);

  const applyOrder = (items: NetworkTarget[]) => {
    if (!sortedIds) return items; // base order
    const idx = new Map(sortedIds.map((id, i) => [id, i]));
    return [...items].sort(
      (a, b) => (idx.get(a.id) ?? Infinity) - (idx.get(b.id) ?? Infinity),
    );
  };

  const sortNow = () => {
    const rank = (t: NetworkTarget) => {
      const r = latencyResults[t.id];
      return r?.status === "done" && typeof r.avg === "number" ? r.avg : Infinity;
    };
    setSortedIds([...filtered].sort((a, b) => rank(a) - rank(b)).map((t) => t.id));
  };

  const ordered = useMemo(
    () => applyOrder(filtered),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, sortedIds],
  );

  // Grouped view: bucket by primary tag (first tag), ordered by TAG_ORDER.
  const groups = useMemo(() => {
    const map = new Map<SiteTag, NetworkTarget[]>();
    for (const t of filtered) {
      const tag = (t.tags[0] ?? "Custom") as SiteTag;
      (map.get(tag) ?? map.set(tag, []).get(tag)!).push(t);
    }
    return TAG_ORDER.filter((tag) => map.has(tag)).map((tag) => ({
      tag,
      items: applyOrder(map.get(tag)!),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortedIds]);

  const toggleCollapse = (tag: SiteTag) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });

  const { speedRunning, monitoring, speedActivityId } = useMemo(() => {
    const speedRunning = new Set<string>();
    const monitoring = new Set<string>();
    const speedActivityId: Record<string, string> = {};
    for (const a of activities) {
      if (a.kind === "speed" && a.running) {
        speedRunning.add(a.target.id);
        speedActivityId[a.target.id] = a.id;
      } else if (a.kind === "monitor" && a.running) {
        monitoring.add(a.target.id);
      }
    }
    return { speedRunning, monitoring, speedActivityId };
  }, [activities]);

  // The card's speed button toggles: start, or stop the in-flight test.
  const handleSpeed = (target: NetworkTarget) => {
    const aid = speedActivityId[target.id];
    if (aid) onAbortActivity(aid);
    else onTestSpeed([target], direction);
  };

  const anyRunning =
    Object.values(latencyResults).some((r) => r.status === "running") ||
    activities.some((a) => a.running || (a.kind === "speed" && a.result.status === "queued"));

  const selectedTargets = filtered.filter((t) => selected.has(t.id));
  const selectedSpeed = selectedTargets.filter((t) => t.speed);
  const hasSelection = selected.size > 0;

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const removeSelected = () => {
    selectedTargets.forEach((t) => remove(t));
    setSelected(new Set());
  };

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));
  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((t) => t.id)));

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (t: NetworkTarget) => {
    setEditing(t);
    setFormOpen(true);
  };

  const renderCard = (target: NetworkTarget) => (
    <SiteCard
      target={target}
      result={latencyResults[target.id]}
      latencyCount={latencyCount}
      autoTest={autoTest}
      speedRunning={speedRunning.has(target.id)}
      monitoring={monitoring.has(target.id)}
      selected={selected.has(target.id)}
      onToggleSelect={() => toggleSelect(target.id)}
      onTestLatency={() => onTestLatency([target])}
      onAutoTest={() => onAutoEnqueue(target)}
      onTestSpeed={target.speed ? () => handleSpeed(target) : undefined}
      onMonitor={() => onMonitor(target)}
      onEdit={target.builtIn ? undefined : () => openEdit(target)}
      onRemove={() => remove(target)}
    />
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索名称"
            className="pl-9"
          />
        </div>

        {/* Quick tag filter — click to narrow without typing. */}
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          <TagChip active={tagFilter === null} onClick={() => setTagFilter(null)}>
            全部
          </TagChip>
          {availableTags.map((tag) => (
            <TagChip
              key={tag}
              active={tagFilter === tag}
              onClick={() => setTagFilter((cur) => (cur === tag ? null : tag))}
            >
              {tag}
            </TagChip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {anyRunning && (
            <Button variant="destructive" size="sm" onClick={onStopAll}>
              <Square className="fill-current" />
              停止全部
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            disabled={filtered.length === 0}
          >
            {allSelected ? <CheckSquare /> : <Square />}
            {allSelected ? "全不选" : "全选"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={sortNow}
            disabled={filtered.length === 0}
            title="按当前平均延迟排序（低延迟在前）"
          >
            <ArrowDownNarrowWide />
            排序
          </Button>
          {hasSelection ? (
            <>
              <Button size="sm" onClick={() => onTestLatency(selectedTargets)}>
                <Activity />
                测延迟 ({selectedTargets.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTestSpeed(selectedSpeed, direction)}
                disabled={selectedSpeed.length === 0}
              >
                <Gauge />
                测速 ({selectedSpeed.length})
              </Button>
              <DirectionToggle direction={direction} onChange={setDirection} />
              <Button variant="outline" size="sm" onClick={removeSelected}>
                <Trash2 />
                删除 ({selectedTargets.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                清除选择
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => onTestLatency(filtered)}>
                <Activity />
                测延迟全部
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTestSpeed(filtered.filter((t) => t.speed), direction)}
              >
                <Gauge />
                测速全部
              </Button>
              <DirectionToggle direction={direction} onChange={setDirection} />
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus />
              添加
            </Button>
            {hiddenCount > 0 && (
              <Button variant="ghost" size="sm" onClick={restoreHidden} title="恢复被隐藏的内置站点">
                <RotateCcw />
                恢复 ({hiddenCount})
              </Button>
            )}
            {customCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCustom}
                className="text-muted-foreground hover:text-destructive"
              >
                清空自定义
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-muted/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <Switch id="auto" checked={autoTest} onCheckedChange={setAutoTest} />
            <Label htmlFor="auto" className="cursor-pointer">自动测速</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="grouped" checked={grouped} onCheckedChange={setGrouped} />
            <Label htmlFor="grouped" className="cursor-pointer">按标签分组</Label>
          </div>
          <span className="text-xs text-muted-foreground">
            {grouped ? "组内按延迟排序" : "全部按延迟排序，低延迟在前"}
          </span>
        </div>

        {formOpen && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">{editing ? "编辑站点" : "添加站点"}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setFormOpen(false)}
                aria-label="关闭"
              >
                <X className="size-4" />
              </Button>
            </div>
            <AddTargetForm
              editing={editing}
              onCancel={() => setFormOpen(false)}
              onSubmit={(t) => {
                const tags = t.tags.includes("Custom")
                  ? t.tags
                  : [...t.tags, "Custom" as const];
                upsert({ ...t, tags });
                setFormOpen(false);
              }}
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          没有匹配的站点
        </div>
      ) : grouped ? (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.tag} className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleCollapse(g.tag)}
                  className="flex items-center gap-1.5 text-sm font-semibold"
                >
                  <ChevronRight
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      !collapsed.has(g.tag) && "rotate-90",
                    )}
                  />
                  {g.tag}
                  <span className="text-xs font-normal text-muted-foreground">{g.items.length}</span>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onTestLatency(g.items)}
                  title={`测试 ${g.tag} 组延迟`}
                >
                  <Activity className="size-3.5" />
                  测本组
                </Button>
              </div>
              {!collapsed.has(g.tag) && <SiteGrid items={g.items} renderCard={renderCard} />}
            </section>
          ))}
        </div>
      ) : (
        <SiteGrid items={ordered} renderCard={renderCard} />
      )}
    </div>
  );
}

/** A responsive card grid with FLIP reordering for its items. */
function SiteGrid({
  items,
  renderCard,
}: {
  items: NetworkTarget[];
  renderCard: (t: NetworkTarget) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFlipReorder(ref, items.map((t) => t.id));
  return (
    <div ref={ref} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((t) => (
        <div key={t.id} data-flip-id={t.id} className="will-change-transform">
          {renderCard(t)}
        </div>
      ))}
    </div>
  );
}

/** Down/Up toggle for the speed test. */
function DirectionToggle({
  direction,
  onChange,
}: {
  direction: SpeedDirection;
  onChange: (d: SpeedDirection) => void;
}) {
  const up = direction === "up";
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onChange(up ? "down" : "up")}
      title={up ? "当前：上行测速（点击切换为下行）" : "当前：下行测速（点击切换为上行）"}
    >
      {up ? <ArrowUp /> : <ArrowDown />}
      {up ? "上行" : "下行"}
    </Button>
  );
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}