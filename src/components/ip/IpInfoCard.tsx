import {
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Network,
  RefreshCw,
  Server,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { bgpToolsUrl, peeringDbUrl } from "@/lib/network/ip-info";
import type { IpInfo } from "@/types";

interface IpInfoCardProps {
  data: IpInfo | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Card summarising the visitor's IP, location, prefix and ASN. State is owned
 * by the parent (fetched once) so re-opening the panel doesn't re-fetch.
 */
export function IpInfoCard({ data, loading, error, reload }: IpInfoCardProps) {
  return (
    <Card className="animate-fade-in overflow-hidden">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4 text-primary" />
            当前网络
          </CardTitle>
          <CardDescription>
            数据来自 ip.sb，路由前缀来自 RIPEstat
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={reload}
          disabled={loading}
          aria-label="刷新"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} />
        </Button>
      </CardHeader>

      <CardContent>
        {loading && <LoadingRow />}
        {error && !loading && <ErrorRow message={error} />}
        {data && !loading && !error && <IpInfoBody info={data} />}
      </CardContent>
    </Card>
  );
}

function IpInfoBody({ info }: { info: IpInfo }) {
  const location = [info.city, info.region, info.country]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <span className="font-mono text-3xl font-semibold tracking-tight">
          {info.ip}
        </span>
        {info.countryCode && (
          <Badge variant="muted" className="mb-1.5">
            {info.countryCode}
          </Badge>
        )}
      </div>

      <Separator />

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <InfoItem icon={<MapPin className="size-4" />} label="位置">
          {location || "未知"}
        </InfoItem>

        <InfoItem icon={<Server className="size-4" />} label="运营商">
          {info.organization || info.asnOrganization || "未知"}
        </InfoItem>

        <InfoItem icon={<Network className="size-4" />} label="路由前缀">
          {info.prefix ? (
            <ExternalLinkValue
              href={bgpToolsUrl(info.prefix)}
              label={info.prefix}
              hint="在 bgp.tools 查看"
            />
          ) : (
            "未知"
          )}
        </InfoItem>

        <InfoItem icon={<Network className="size-4" />} label="ASN">
          {info.asn ? (
            <ExternalLinkValue
              href={peeringDbUrl(info.asn)}
              label={`AS${info.asn}`}
              hint="在 PeeringDB 查看"
            />
          ) : (
            "未知"
          )}
        </InfoItem>
      </dl>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function ExternalLinkValue({
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
      className="group inline-flex items-center gap-1 font-mono text-primary underline-offset-4 hover:underline"
    >
      {label}
      <ExternalLink className="size-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      正在获取网络信息…
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}（可能由网络环境或浏览器拦截导致）
    </div>
  );
}