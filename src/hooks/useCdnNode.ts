import { useEffect, useState } from "react";

import { resolveCdnNode } from "@/config/cdn-probes";
import type { CdnNode, NetworkTarget } from "@/types";

/**
 * Best-effort resolution of the CDN edge/PoP serving a target.
 *
 * The probe runs whenever `trigger` changes to a positive value — wired to fire
 * *after* a latency test completes, and to re-run (refresh the node) on every
 * subsequent test. It stays idle until the first test, so cards that were never
 * tested make no extra requests. Returns `null` when nothing is readable
 * cross-origin (most non-CDN or CORS-locked origins).
 */
export function useCdnNode(target: NetworkTarget, trigger: number): CdnNode | null {
  const [node, setNode] = useState<CdnNode | null>(null);

  useEffect(() => {
    if (trigger <= 0) return;
    const controller = new AbortController();
    resolveCdnNode(target, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setNode(result);
      })
      .catch(() => {});
    return () => controller.abort();
    // Re-probe on each new trigger; target id keys the binding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id, trigger]);

  return node;
}