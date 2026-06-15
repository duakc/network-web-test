import { useEffect, useState } from "react";
import { ArrowUp, PanelRightClose, PanelRightOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

interface FloatingControlsProps {
  containerRef: React.RefObject<HTMLElement>;
  rightOpen: boolean;
  onToggleRight: () => void;
}

/**
 * Floating controls. The activity-panel toggle sits bottom-RIGHT — right next to
 * the panel it opens/closes, so toggling it costs almost no mouse travel. The
 * scroll-to-top button stays bottom-left, by the scrollable site list it acts on.
 */
export function FloatingControls({
  containerRef,
  rightOpen,
  onToggleRight,
}: FloatingControlsProps) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setShowTop(el.scrollTop > 320);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-30 size-10 rounded-full bg-card shadow-md"
        onClick={onToggleRight}
        title={rightOpen ? "隐藏面板" : "显示面板"}
        aria-label="切换面板"
      >
        {rightOpen ? <PanelRightClose /> : <PanelRightOpen />}
      </Button>
      {showTop && (
        <Button
          size="icon"
          className="fixed bottom-4 left-4 z-30 size-10 rounded-full shadow-lg"
          onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          title="回到顶部"
          aria-label="回到顶部"
        >
          <ArrowUp />
        </Button>
      )}
    </>
  );
}