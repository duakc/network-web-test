import { useCallback, useEffect, useState } from "react";

import { fetchIpInfoV4, fetchIpInfoV6 } from "@/lib/network/ip-info";
import type { IpInfo } from "@/types";

export interface UseIpInfoState {
  /** IPv4 view (null if unavailable / still loading). */
  v4: IpInfo | null;
  /** IPv6 view (null if the visitor has no IPv6 connectivity). */
  v6: IpInfo | null;
  loading: boolean;
  /** Set only when BOTH families failed (otherwise we show whatever resolved). */
  error: string | null;
  reload: () => void;
}

/**
 * Resolves the visitor's IPv4 and IPv6 info in parallel (ip.sb). Each family is
 * independent — one can resolve while the other fails (e.g. no IPv6), and the
 * card hides what's missing.
 */
export function useIpInfo(): UseIpInfoState {
  const [v4, setV4] = useState<IpInfo | null>(null);
  const [v6, setV6] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setV4(null);
    setV6(null);

    Promise.allSettled([
      fetchIpInfoV4(controller.signal),
      fetchIpInfoV6(controller.signal),
    ]).then(([r4, r6]) => {
      if (controller.signal.aborted) return;
      const a = r4.status === "fulfilled" ? r4.value : null;
      const b = r6.status === "fulfilled" ? r6.value : null;
      setV4(a);
      setV6(b);
      if (!a && !b) setError("获取 IP 信息失败");
      setLoading(false);
    });

    return () => controller.abort();
  }, [nonce]);

  return { v4, v6, loading, error, reload };
}