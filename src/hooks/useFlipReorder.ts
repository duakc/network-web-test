import { useLayoutEffect, useRef } from "react";

// ── Tunable animation durations (ms) ──────────────────────────────────────
// FADE_MS: the "whiten / re-render" fade used for bulk re-sorts. Make it
//   longer (2000–3000) if you want the transition to read more slowly.
// MOVE_MS: the smooth slide used when an item shifts by a single position.
const FADE_MS = 2200;
const MOVE_MS = 260;

/**
 * Animates grid reordering (FLIP). Children must carry `data-flip-id`.
 *
 *  - When items shift by at most one position, they slide smoothly to their new
 *    spots (transform transition).
 *  - When any item jumps more than one position (e.g. a bulk re-sort from
 *    "test all" / multi-select), sliding everything looks chaotic, so instead
 *    the whole grid briefly fades out and fades back in at the new order.
 */
export function useFlipReorder(
  containerRef: React.RefObject<HTMLElement>,
  order: string[],
) {
  const prev = useRef<{ rects: Map<string, DOMRect>; order: string[] }>({
    rects: new Map(),
    order: [],
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const nodes = Array.from(
      el.querySelectorAll<HTMLElement>("[data-flip-id]"),
    );
    const newRects = new Map<string, DOMRect>();
    nodes.forEach((n) => newRects.set(n.dataset.flipId!, n.getBoundingClientRect()));

    const { rects: prevRects, order: prevOrder } = prev.current;
    const orderChanged =
      order.length !== prevOrder.length ||
      order.some((id, i) => id !== prevOrder[i]);

    if (prevRects.size && orderChanged) {
      let maxDelta = 0;
      order.forEach((id, i) => {
        const oi = prevOrder.indexOf(id);
        if (oi !== -1) maxDelta = Math.max(maxDelta, Math.abs(oi - i));
      });

      if (maxDelta > 1) {
        // Bulk re-sort: fade out, then fade back in at the new positions.
        nodes.forEach((n) => {
          n.style.transition = "none";
          n.style.opacity = "0";
        });
        requestAnimationFrame(() => {
          nodes.forEach((n) => {
            n.style.transition = `opacity ${FADE_MS}ms ease`;
            n.style.opacity = "1";
          });
        });
      } else {
        // Small move: invert to old position, then animate to the new one.
        nodes.forEach((n) => {
          const id = n.dataset.flipId!;
          const pr = prevRects.get(id);
          const nr = newRects.get(id);
          if (!pr || !nr) return;
          const dx = pr.left - nr.left;
          const dy = pr.top - nr.top;
          if (!dx && !dy) return;
          n.style.transition = "none";
          n.style.transform = `translate(${dx}px, ${dy}px)`;
          requestAnimationFrame(() => {
            n.style.transition = `transform ${MOVE_MS}ms ease`;
            n.style.transform = "";
          });
        });
      }
    }

    prev.current = { rects: newRects, order: [...order] };
  }, [containerRef, order.join("|")]);
}