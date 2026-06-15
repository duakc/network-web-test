import { useCallback, useEffect, useState } from "react";

import { DEFAULT_SETTINGS } from "@/config/targets";
import type { TestSettings } from "@/types";

const STORAGE_KEY = "network-test:settings";

function load(): TestSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<TestSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Test settings, persisted to localStorage. */
export function useSettings() {
  const [settings, setSettings] = useState<TestSettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage may be unavailable */
    }
  }, [settings]);

  const update = useCallback(
    (patch: Partial<TestSettings>) =>
      setSettings((prev) => ({ ...prev, ...patch })),
    [],
  );

  return { settings, update };
}