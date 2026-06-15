import { useEffect, useRef, useState } from "react";
import { PanelRightClose } from "lucide-react";

import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { IpInfoCard } from "@/components/ip/IpInfoCard";
import { FloatingControls } from "@/components/layout/FloatingControls";
import { LinksCard } from "@/components/layout/LinksCard";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { SiteList } from "@/components/site/SiteList";
import { Button } from "@/components/ui/button";
import { useIpInfo } from "@/hooks/useIpInfo";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSettings } from "@/hooks/useSettings";
import { useTestRunner } from "@/hooks/useTestRunner";

export default function App() {
  const { settings, update } = useSettings();
  const ip = useIpInfo(); // fetched once at the top level — survives panel toggles
  const {
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
  } = useTestRunner(settings);

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  // Activity panel is hidden by default (both desktop & mobile); the user opens it
  // with the bottom-right toggle. It also auto-reveals when a new test starts.
  const [rightOpen, setRightOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  // Resizable docked panel: drag the divider to widen the activity column (e.g.
  // to read a speed chart closely). Persisted; both sides keep a minimum width.
  const RIGHT_MIN = 320;
  const LEFT_MIN = 480;
  // Default split: left (site list) 65% / right (activity) 35%.
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = Number(localStorage.getItem("network-test:rightWidth"));
    return saved >= RIGHT_MIN ? saved : Math.round(window.innerWidth * 0.35);
  });
  useEffect(() => {
    localStorage.setItem("network-test:rightWidth", String(rightWidth));
  }, [rightWidth]);

  // Re-clamp on mount and whenever the window shrinks, so a persisted (or large)
  // panel width never starves the left column below its minimum.
  useEffect(() => {
    const clamp = () =>
      setRightWidth((w) =>
        Math.max(RIGHT_MIN, Math.min(w, window.innerWidth - LEFT_MIN)),
      );
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const w = window.innerWidth - ev.clientX;
      setRightWidth(Math.max(RIGHT_MIN, Math.min(w, window.innerWidth - LEFT_MIN)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // When a new activity is added (newest is at the front), reveal the panel and
  // scroll to it.
  const topId = activities[0]?.id;
  const prevTopId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (topId && topId !== prevTopId.current) {
      prevTopId.current = topId;
      setRightOpen(true);
      setFocusId(topId);
    }
  }, [topId]);

  const rightContent = (showClose: boolean) => (
    <div className="space-y-6">
      {showClose && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setRightOpen(false)}
            title="隐藏面板"
            aria-label="隐藏面板"
          >
            <PanelRightClose className="size-4" />
          </Button>
        </div>
      )}
      <LinksCard />
      <IpInfoCard ip={ip} />
      <SettingsCard settings={settings} onChange={update} />
      <ActivityFeed
        activities={activities}
        focusId={focusId}
        onStopActivity={abortActivity}
        onRemove={removeActivity}
        onClearInactive={clearInactive}
        onRetest={(target, dir) => testSpeed([target], dir)}
      />
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <div ref={leftRef} className="no-scrollbar h-full min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-[1400px]">
          <SiteList
            latencyResults={latencyResults}
            activities={activities}
            latencyCount={settings.latencyCount}
            direction={settings.speedDirection}
            onTestLatency={testLatency}
            onAutoEnqueue={autoEnqueue}
            onTestSpeed={testSpeed}
            onAbortActivity={abortActivity}
            onMonitor={startMonitor}
            onStopAll={stopAll}
          />
          <p className="py-6 text-center text-xs text-muted-foreground">
            本项目几乎完全由 AI 生成，仅供学习与自测参考 · 测速会消耗真实流量
          </p>
        </div>
      </div>

      {/* Desktop: docked, resident column with a draggable divider */}
      {isDesktop && rightOpen && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={startResize}
            title="拖动调整宽度"
            className="group relative w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40"
          >
            <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
          </div>
          <aside
            style={{ width: rightWidth }}
            className="no-scrollbar h-full shrink-0 overflow-y-auto border-l border-border bg-muted/30 px-4 py-4"
          >
            {rightContent(true)}
          </aside>
        </>
      )}

      {/* Mobile: drawer overlay, click backdrop to close */}
      {!isDesktop && rightOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setRightOpen(false)} />
          <aside className="no-scrollbar absolute right-0 top-0 h-full w-[88%] max-w-md overflow-y-auto bg-background p-4 shadow-2xl">
            {rightContent(true)}
          </aside>
        </div>
      )}

      <FloatingControls
        containerRef={leftRef}
        rightOpen={rightOpen}
        onToggleRight={() => setRightOpen((o) => !o)}
      />
    </div>
  );
}