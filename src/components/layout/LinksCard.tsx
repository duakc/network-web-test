import { useState } from "react";
import { ChevronRight, ExternalLink, Link2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Friendly / tool links. Edit this list to taste. */
const LINKS: { name: string; url: string }[] = [
  { name: "Cloudflare Speed", url: "https://speed.cloudflare.com" },
  { name: "Speedtest", url: "https://www.speedtest.net" },
  { name: "Ping.pe", url: "https://ping.pe" },
  { name: "Itdog", url: "https://www.itdog.cn" },
];

/**
 * Collapsed-by-default block of friendly/tool links, shown at the top of the
 * right panel. Click the header to expand.
 */
export function LinksCard() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium"
      >
        <Link2 className="size-4 text-primary" />
        友情 / 工具链接
        <ChevronRight
          className={cn(
            "ml-auto size-4 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
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
