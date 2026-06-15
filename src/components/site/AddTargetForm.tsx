import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SELECTABLE_TAGS, type SiteTag } from "@/config/tags";
import {
  detectCloudflare,
  fetchTitle,
  hostOf,
  iconFor,
  isValidHttpUrl,
  originOf,
} from "@/lib/network/site";
import { cn } from "@/lib/utils";
import type { NetworkTarget } from "@/types";

interface AddTargetFormProps {
  /** When set, the form edits this target instead of adding a new one. */
  editing?: NetworkTarget | null;
  onSubmit: (target: NetworkTarget) => void;
  onCancel: () => void;
}

/**
 * Add or edit a user-defined target.
 *  - Blank name → fetch the page <title> (falls back to hostname).
 *  - Cloudflare-fronted origins probe `/cdn-cgi/trace` for edge latency.
 *  - An optional CORS-enabled file URL makes the target speed-testable.
 *  - Tags are chosen from the known set.
 */
export function AddTargetForm({ editing, onSubmit, onCancel }: AddTargetFormProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [url, setUrl] = useState(editing ? originUrl(editing) : "");
  const [speedUrl, setSpeedUrl] = useState(editing?.speed?.url ?? "");
  const [tags, setTags] = useState<SiteTag[]>(editing?.tags ?? []);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const trimmedUrl = url.trim();
  const trimmedSpeed = speedUrl.trim();
  const valid =
    isValidHttpUrl(trimmedUrl) &&
    (trimmedSpeed === "" || isValidHttpUrl(trimmedSpeed));

  const toggleTag = (tag: SiteTag) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setHint(null);

    const origin = originOf(trimmedUrl);
    const controller = new AbortController();

    setHint("正在探测 Cloudflare / 获取标题…");
    const isCf = origin ? await detectCloudflare(origin, controller.signal) : false;
    const latencyUrl =
      isCf && origin ? `${origin}/cdn-cgi/trace` : faviconOrSelf(trimmedUrl);

    let resolvedName = name.trim();
    if (!resolvedName) {
      resolvedName =
        (await fetchTitle(trimmedUrl, controller.signal)) ?? hostOf(trimmedUrl);
    }

    const target: NetworkTarget = {
      id: editing?.id ?? `custom:${trimmedUrl}`,
      name: resolvedName,
      icon: origin ? iconFor(hostOf(trimmedUrl)) : faviconOrSelf(trimmedUrl),
      latencyUrl,
      tags,
      cloudflare: isCf || undefined,
      speed: trimmedSpeed ? { kind: "fixed", url: trimmedSpeed } : undefined,
      builtIn: false,
    };

    onSubmit(target);
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="t-name">名称（留空则自动获取标题）</Label>
          <Input
            id="t-name"
            placeholder="例如：我的服务器"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-url">网站地址</Label>
          <Input
            id="t-url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="t-speed">测速文件地址（可选，需支持 CORS）</Label>
        <Input
          id="t-speed"
          placeholder="https://example.com/large-file.bin"
          value={speedUrl}
          onChange={(e) => setSpeedUrl(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="space-y-1.5">
        <Label>标签</Label>
        <div className="flex flex-wrap gap-1.5">
          {SELECTABLE_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              disabled={busy}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                tags.includes(tag)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-muted-foreground">
          {hint ?? "目标保存在浏览器本地（localStorage）。"}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            取消
          </Button>
          <Button type="submit" disabled={!valid || busy}>
            {busy && <Loader2 className="animate-spin" />}
            {editing ? "保存" : "添加"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function faviconOrSelf(url: string): string {
  const origin = originOf(url);
  return origin ? `${origin}/favicon.ico` : url;
}

/** Recover an editable site URL from a stored target's latency endpoint. */
function originUrl(target: NetworkTarget): string {
  return originOf(target.latencyUrl) ?? target.latencyUrl;
}