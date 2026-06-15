import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Settings2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { THREAD_OPTIONS } from "@/config/targets";
import { cn } from "@/lib/utils";
import type { TestSettings } from "@/types";

interface SettingsCardProps {
  settings: TestSettings;
  onChange: (patch: Partial<TestSettings>) => void;
}

/**
 * Persistent test configuration, read when a test starts (so you can set
 * threads/duration/etc. before clicking a test button).
 */
export function SettingsCard({ settings, onChange }: SettingsCardProps) {
  const rampStepSec = (
    settings.speedDurationMs / 1000 / settings.speedThreads
  ).toFixed(1);

  const isPresetThread = (THREAD_OPTIONS as readonly number[]).includes(
    settings.speedThreads,
  );
  const [customThread, setCustomThread] = useState(!isPresetThread);

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings2 className="size-4 text-primary" />
          测试设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-0">
        {/* Latency / monitor */}
        <section className="space-y-2">
          <SectionLabel>延迟测试</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="延迟次数"
              value={settings.latencyCount}
              min={1}
              onChange={(v) => onChange({ latencyCount: v })}
            />
            <NumberField
              label="监测间隔(秒)"
              value={settings.monitorIntervalMs / 1000}
              min={1}
              max={60}
              onChange={(v) => onChange({ monitorIntervalMs: v * 1000 })}
            />
          </div>
        </section>

        <div className="h-px bg-border" />

        {/* Speed */}
        <section className="space-y-2">
          <SectionLabel>速度测试</SectionLabel>
          <div className="space-y-1.5">
            <Label className="text-xs">测速方向</Label>
            <div className="inline-flex w-full items-center gap-0.5 rounded-lg bg-muted p-0.5">
              {([
                { dir: "down", label: "下行", Icon: ArrowDown },
                { dir: "up", label: "上行", Icon: ArrowUp },
              ] as const).map(({ dir, label, Icon }) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => onChange({ speedDirection: dir })}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1 rounded-md px-1 py-1 text-xs font-medium transition-colors",
                    settings.speedDirection === dir
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Label className="text-xs">线程数</Label>
          <div className="inline-flex w-full items-center gap-0.5 rounded-lg bg-muted p-0.5">
            {THREAD_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setCustomThread(false);
                  onChange({ speedThreads: n });
                }}
                className={cn(
                  "flex-1 rounded-md px-1 py-1 text-xs font-medium tabular-nums transition-colors",
                  !customThread && settings.speedThreads === n
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomThread(true)}
              className={cn(
                "flex-1 rounded-md px-1 py-1 text-xs font-medium transition-colors",
                customThread || !isPresetThread
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              自定义
            </button>
          </div>
          {(customThread || !isPresetThread) && (
            <NumberField
              label="自定义线程数"
              value={settings.speedThreads}
              min={1}
              max={64}
              onChange={(v) => onChange({ speedThreads: Math.max(1, v) })}
            />
          )}
          <p className="text-[10px] leading-snug text-muted-foreground">
            并发连接数：线程越多越能跑满高带宽链路，单线程更接近单条连接的真实体感。
          </p>
          {/* Stop condition: time and traffic are mutually exclusive. */}
          <Label className="text-xs">停止条件</Label>
          <div className="inline-flex w-full items-center gap-0.5 rounded-lg bg-muted p-0.5">
            {([
              { mode: "time", label: "按时间" },
              { mode: "data", label: "按流量" },
            ] as const).map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  onChange(
                    mode === "data" && (settings.speedStopMB ?? 0) < 300
                      ? { speedLimitMode: mode, speedStopMB: 300 }
                      : { speedLimitMode: mode },
                  )
                }
                className={cn(
                  "flex-1 rounded-md px-1 py-1 text-xs font-medium transition-colors",
                  settings.speedLimitMode === mode
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {settings.speedLimitMode === "time" ? (
            <NumberField
              label="时长(秒)"
              value={settings.speedDurationMs / 1000}
              min={3}
              max={120}
              onChange={(v) => onChange({ speedDurationMs: v * 1000 })}
            />
          ) : (
            <NumberField
              label="流量上限(MB)"
              value={settings.speedStopMB ?? 300}
              min={300}
              max={100000}
              onChange={(v) => onChange({ speedStopMB: Math.max(300, v) })}
            />
          )}
          <ToggleRow
            id="ramp"
            label="渐进加速（延迟启动线程）"
            checked={settings.speedRamp}
            onChange={(v) => onChange({ speedRamp: v })}
            title={`开启后连接分批启动：当前约每 ${rampStepSec}s 增加一条，到测速末尾全部就位，可观察吞吐随并发增长。若想看高负载对延迟的影响，可同时对另一站点开启长期监测自行对比。`}
          />
        </section>
      </CardContent>
    </Card>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onChange,
  title,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2" title={title}>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer">
        {label}
      </Label>
    </div>
  );
}

/**
 * Number input that tolerates intermediate states (empty / leading zeros) while
 * typing, and clamps out-of-range values to [min, max] on commit.
 */
function NumberField({
  label,
  value,
  min,
  max,
  allowEmpty,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | "";
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  placeholder?: string;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(value === "" ? "" : String(value));
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from external value unless the user is actively editing.
  useEffect(() => {
    if (!focused.current) setText(value === "" ? "" : String(value));
  }, [value]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const clamp = (n: number) => {
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  };

  // Debounce: only push the value to settings after 3s of no edits, so typing
  // (and the resulting re-render) doesn't churn while you adjust the number.
  const scheduleCommit = (n: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(n), 3000);
  };

  const handleChange = (raw: string) => {
    setText(raw);
    if (raw === "") {
      if (allowEmpty) scheduleCommit(0);
      return;
    }
    const n = Number(raw);
    if (!Number.isNaN(n)) scheduleCommit(clamp(n));
  };

  const handleBlur = () => {
    focused.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (text === "") {
      setText(allowEmpty ? "" : String(min ?? 0));
      onChange(allowEmpty ? 0 : (min ?? 0));
      return;
    }
    const n = Number(text);
    const v = Number.isNaN(n) ? (min ?? 0) : clamp(n);
    setText(String(v));
    onChange(v); // commit immediately on blur
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        value={text}
        min={min}
        max={max}
        placeholder={placeholder}
        onFocus={() => (focused.current = true)}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className="h-9"
      />
    </div>
  );
}