import { ExternalLink, Globe, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UseIpInfoState } from "@/hooks/useIpInfo";
import { bgpToolsUrl, peeringDbUrl } from "@/lib/network/ip-info";
import type { IpInfo } from "@/types";

interface IpInfoCardProps {
  ip: UseIpInfoState;
}

/**
 * Visitor network card: one line per IP family (IPv4 / IPv6), each showing the
 * address, operator, routed prefix (→ bgp.tools) and ASN (→ PeeringDB). A family
 * that can't be resolved is simply omitted.
 */
export function IpInfoCard({ ip }: IpInfoCardProps) {
  const { v4, v6, loading, error, reload } = ip;

  return (
    <Card className="animate-fade-in overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 py-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="size-4 text-primary" />
          IP 信息
        </CardTitle>
        <Button variant="ghost" size="icon" className="size-7" onClick={reload} disabled={loading} aria-label="刷新">
          <RefreshCw className={loading ? "animate-spin" : ""} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-1 pb-3">
        {loading && (
          <div className="flex items-center gap-2 py-0.5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            正在获取网络信息…
          </div>
        )}
        {error && !loading && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}（可能由网络环境或浏览器拦截导致）
          </div>
        )}

        {!loading && v4 && <IpLine label="IPv4" info={v4} />}
        {!loading && v6 && <IpLine label="IPv6" info={v6} />}
      </CardContent>
    </Card>
  );
}

/** One IP line: `<label>: <ip>  <ISP>  (<prefix>)  (AS<asn>)  <location>`. */
function IpLine({ label, info }: { label: string; info: IpInfo }) {
  const isp = info.organization || info.asnOrganization;
  const location = [info.city, info.region, info.country].filter(Boolean).join(" ");
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="select-text font-mono font-medium">{info.ip}</span>
      {isp && <span className="text-muted-foreground">{isp}</span>}
      {info.prefix && (
        <LinkChip href={bgpToolsUrl(info.prefix)} label={info.prefix} hint="在 bgp.tools 查看" />
      )}
      {info.asn != null && (
        <LinkChip href={peeringDbUrl(info.asn)} label={`AS${info.asn}`} hint="在 PeeringDB 查看" />
      )}
      {location && <span className="text-muted-foreground">{location}</span>}
    </div>
  );
}

function LinkChip({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={hint}
      className="group inline-flex items-center gap-0.5 font-mono text-xs text-primary underline-offset-4 hover:underline"
    >
      ({label}
      <ExternalLink className="size-3 opacity-50 transition-opacity group-hover:opacity-100" />)
    </a>
  );
}