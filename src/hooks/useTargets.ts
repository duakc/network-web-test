import { useCallback, useEffect, useMemo, useState } from "react";

import { PRESET_TARGETS, sortTargets } from "@/config/targets";
import type { NetworkTarget } from "@/types";

const CUSTOM_KEY = "network-test:custom-targets";
const HIDDEN_KEY = "network-test:hidden-builtins";

function loadCustom(): NetworkTarget[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") as NetworkTarget[];
    return Array.isArray(parsed)
      ? parsed.filter((t) => t && t.id).map((t) => ({ ...t, tags: t.tags ?? [] }))
      : [];
  } catch {
    return [];
  }
}

function loadHidden(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * The target library: built-in presets + user-defined targets, with built-ins
 * the user has hidden filtered out. Custom targets and the hidden set both
 * persist to localStorage. `remove` hides a built-in or deletes a custom one.
 */
export function useTargets() {
  const [custom, setCustom] = useState<NetworkTarget[]>(loadCustom);
  const [hidden, setHidden] = useState<string[]>(loadHidden);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
    } catch {
      /* ignore */
    }
  }, [custom]);
  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
    } catch {
      /* ignore */
    }
  }, [hidden]);

  const upsert = useCallback((target: NetworkTarget) => {
    setCustom((prev) => {
      const idx = prev.findIndex((t) => t.id === target.id);
      if (idx === -1) return [...prev, target];
      const next = [...prev];
      next[idx] = target;
      return next;
    });
  }, []);

  const remove = useCallback((target: NetworkTarget) => {
    if (target.builtIn) {
      setHidden((prev) => (prev.includes(target.id) ? prev : [...prev, target.id]));
    } else {
      setCustom((prev) => prev.filter((t) => t.id !== target.id));
    }
  }, []);

  const clearCustom = useCallback(() => setCustom([]), []);
  const restoreHidden = useCallback(() => setHidden([]), []);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const targets = useMemo(
    () =>
      sortTargets([...PRESET_TARGETS, ...custom]).filter((t) => !hiddenSet.has(t.id)),
    [custom, hiddenSet],
  );

  return {
    targets,
    customCount: custom.length,
    hiddenCount: hidden.length,
    upsert,
    remove,
    clearCustom,
    restoreHidden,
  };
}