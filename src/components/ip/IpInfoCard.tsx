import { ExternalLink, Globe, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UseIpInfoState } from "@/hooks/useIpInfo";
import { bgpToolsAsnUrl, bgpToolsUrl, PeerAsUrl, peeringDbUrl } from "@/lib/network/ip-info";
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
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={reload}
          disabled={loading}
          aria-label="刷新"
        >
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

/**
 * One IP family block. The top line keeps the readable info together —
 * `<label> <ip> <ISP> <location>` — and below it an aligned mini-table lists the
 * AS number and routed Prefix (the value itself says which is which — no label),
 * each with its lookup services in fixed columns (PeeringDB · bgp.tools · peer.as)
 * so they line up top-to-bottom.
 */
function IpLine({ label, info }: { label: string; info: IpInfo }) {
  const isp = info.organization || info.asnOrganization;
  const location = [info.city, info.region, info.country]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="select-text font-mono font-medium">{info.ip}</span>
        {isp && <span className="text-muted-foreground">{isp}</span>}
        {location && <span className="text-muted-foreground">{location}</span>}
      </div>

      {/* Lookups: [value] [PeeringDB] [bgp.tools] [peer.as], columns aligned. The
          AS-number / CIDR value already tells you which row is which. */}
      {(info.asn != null || info.prefix) && (
        <div className="grid w-fit grid-cols-[auto_auto_auto_auto] items-baseline gap-x-3 gap-y-0.5 pl-1 text-xs">
          {info.asn != null && (
            <>
              <span className="select-text font-mono font-medium">AS{info.asn}</span>
              <LinkChip href={peeringDbUrl(info.asn)} label="PeeringDB" hint="在 PeeringDB 查看" />
              <LinkChip href={bgpToolsAsnUrl(info.asn)} label="bgp.tools" hint="在 bgp.tools 查看" />
              <LinkChip href={PeerAsUrl(`AS${info.asn}`)} label="peer.as" hint="在 peer.as 查看" />
            </>
          )}
          {info.prefix && (
            <>
              <span className="select-text font-mono font-medium">{info.prefix}</span>
              {/* PeeringDB has no prefix page — empty cell keeps the columns aligned. */}
              <span />
              <LinkChip href={bgpToolsUrl(info.prefix)} label="bgp.tools" hint="在 bgp.tools 查看" />
              <LinkChip href={PeerAsUrl(info.prefix)} label="peer.as" hint="在 peer.as 查看" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LinkChip({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={hint}
      className="group inline-flex items-center gap-0.5 text-xs text-primary underline-offset-4 hover:underline"
    >
      {label}
      <ExternalLink className="size-3 opacity-50 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
