import { useEffect, useState } from "react";
import { ArrowUp, PanelRightClose, PanelRightOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

interface FloatingControlsProps {
  containerRef: React.RefObject<HTMLElement>;
  rightOpen: boolean;
  onToggleRight: () => void;
}

/** Bottom-left control cluster: panel toggle + scroll-to-top, side by side. */
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
    <div className="fixed bottom-4 left-4 z-30 flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-10 rounded-full bg-card shadow-md"
        onClick={onToggleRight}
        title={rightOpen ? "隐藏面板" : "显示面板"}
        aria-label="切换面板"
      >
        {rightOpen ? <PanelRightClose /> : <PanelRightOpen />}
      </Button>
      {showTop && (
        <Button
          size="icon"
          className="size-10 rounded-full shadow-lg"
          onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          title="回到顶部"
          aria-label="回到顶部"
        >
          <ArrowUp />
        </Button>
      )}
    </div>
  );
}