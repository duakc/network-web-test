import { useEffect, useRef, useState } from "react";
import { PanelRightClose } from "lucide-react";

import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { IpInfoCard } from "@/components/ip/IpInfoCard";
import { FloatingControls } from "@/components/layout/FloatingControls";
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
  const [rightOpen, setRightOpen] = useState(isDesktop);
  const [focusId, setFocusId] = useState<string | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  // Keep the panel resident on desktop; closed (drawer) on mobile by default.
  useEffect(() => setRightOpen(isDesktop), [isDesktop]);

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
      <IpInfoCard data={ip.data} loading={ip.loading} error={ip.error} reload={ip.reload} />
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
      <div ref={leftRef} className="no-scrollbar h-full flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-[1400px]">
          <SiteList
            latencyResults={latencyResults}
            activities={activities}
            latencyCount={settings.latencyCount}
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

      {/* Desktop: docked, resident column */}
      {isDesktop && rightOpen && (
        <aside className="no-scrollbar h-full w-[400px] shrink-0 overflow-y-auto border-l border-border px-4 py-4">
          {rightContent(true)}
        </aside>
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