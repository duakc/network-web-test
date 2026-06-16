import { useState } from "react";
import { ChevronRight, ExternalLink, Heart, Link2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Projects whose public test points / methodology this site relies on. Many are
 * run at the authors' own expense, so they are credited here — and where a source
 * is volunteer-funded (CloudPing), the app also caps probes per run (see
 * `maxLatencyCount`) to avoid running up their bill.
 */
const THANKS: { name: string; url: string; desc: string }[] = [
  {
    name: "CloudPing.cloud · 翡翠云",
    url: "https://cloud.feitsui.com/",
    desc: "公益提供 阿里云 / 腾讯云 / 华为云 / 百度云 / GCP / Azure 各区域的 httping 观测点。这些节点由作者自费维护，过度测速会推高其账单——本站已将每个节点的单次探测限制在 16 次以内，也请你不要频繁测速。",
  },
  {
    name: "skk.moe · Sukka",
    url: "https://skk.moe/",
    desc: "提供了本站使用的部分 CDN 测试端点与测速思路。",
  },
  {
    name: "PerfOps",
    url: "https://perfops.net/",
    desc: "提供了 Akamai / OVH 等 CDN 的 RUM 测速边缘端点。",
  },
];

/** Friendly / tool links. Edit this list to taste. */
const LINKS: { name: string; url: string }[] = [
  { name: "Cloudflare Speed", url: "https://speed.cloudflare.com" },
  { name: "Speedtest", url: "https://www.speedtest.net" },
  { name: "Ping.pe", url: "https://ping.pe" },
  { name: "Itdog", url: "https://www.itdog.cn" },
  { name: "BgpTools", url: "https://bgp.tools" },
  { name: "PeeringDB", url: "https://peeringdb.com" },
  { name: "Peer-AS", url: "https://peer.as" },
  { name: "Nexttrace", url: "https://www.nxtrace.org" },
];

/**
 * Top of the right panel: a collapsed-by-default "Special Thanks" block (accent
 * styled so it draws the eye even while closed) above the friendly/tool links.
 */
export function LinksCard() {
  const [thanksOpen, setThanksOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      {/* Special thanks — accent border + tint so it stands out while collapsed. */}
      <button
        type="button"
        onClick={() => setThanksOpen((o) => !o)}
        className="flex w-full items-center gap-2 border-l-2 border-primary bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary"
      >
        <Heart className="size-4 fill-primary/20" />
        特别感谢
        <ChevronRight
          className={cn(
            "ml-auto size-4 transition-transform",
            thanksOpen && "rotate-90",
          )}
        />
      </button>
      {thanksOpen && (
        <div className="space-y-2 border-l-2 border-primary/40 bg-primary/[0.02] px-4 pb-3 pt-1">
          <p className="text-xs leading-relaxed text-muted-foreground">
            没有下面这些项目，就没有现在的本站。它们贡献了本站赖以运行的测试节点与思路，在此由衷感谢
            🙏
          </p>
          {THANKS.map((t) => (
            <div key={t.url} className="rounded-md bg-muted/50 px-3 py-2">
              <a
                href={t.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary"
              >
                {t.name}
                <ExternalLink className="size-3 shrink-0 opacity-50" />
              </a>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {t.desc}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="h-px bg-border" />

      {/* Friendly / tool links. */}
      <button
        type="button"
        onClick={() => setLinksOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium"
      >
        <Link2 className="size-4 text-primary" />
        友情 / 工具链接
        <ChevronRight
          className={cn(
            "ml-auto size-4 text-muted-foreground transition-transform",
            linksOpen && "rotate-90",
          )}
        />
      </button>
      {linksOpen && (
        <div className="grid grid-cols-2 gap-1.5 px-4 pb-3">
          {LINKS.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer noopener"
              title={l.url}
              className="group flex items-center gap-1 truncate rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <span className="truncate">{l.name}</span>
              <ExternalLink className="size-3 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
