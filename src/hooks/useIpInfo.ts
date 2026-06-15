import { useCallback, useEffect, useState } from "react";

import { fetchIpInfo } from "@/lib/network/ip-info";
import type { IpInfo } from "@/types";

interface UseIpInfoState {
  data: IpInfo | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Fetches the visitor's IP/geo/ASN info on mount, with a manual reload. */
export function useIpInfo(): UseIpInfoState {
  const [data, setData] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchIpInfo(controller.signal)
      .then((info) => setData(info))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "获取 IP 信息失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [nonce]);

  return { data, loading, error, reload };
}