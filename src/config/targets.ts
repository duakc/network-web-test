import { iconFor } from "@/lib/network/site";
import { ICON_OVERRIDES } from "@/config/icon-overrides";
import { tagRank } from "@/config/tags";
import type { NetworkTarget, TestSettings } from "@/types";

/**
 * Built-in targets. `speed` is only set for CORS-enabled endpoints (the only
 * ones a browser can measure throughput against). Steam / Akamai / Microsoft /
 * QQ large files don't expose CORS, so they are latency-only here — add your
 * own CORS-enabled file via the custom form to speed-test them.
 *
 * Built-in icons are served locally from `/icons/<id>.png` (pre-fetched by
 * `pnpm fetch-icons`); see the post-processing at the bottom of this file.
 * `iconFor` here is a fallback only used if the local asset is missing.
 */
const RAW_PRESETS: NetworkTarget[] = [
  // ---- Speed-capable (CORS) ----
  {
    id: "cloudflare",
    name: "Cloudflare",
    icon: iconFor("cloudflare.com"),
    // Latency against the main site's edge; speed uses the dedicated endpoint.
    latencyUrl: "https://www.cloudflare.com/cdn-cgi/trace",
    tags: ["CDN", "Speedtest"],
    cloudflare: true,
    speed: {
      kind: "cloudflare",
      url: "https://speed.cloudflare.com/__down",
      uploadUrl: "https://speed.cloudflare.com/__up",
    },
    builtIn: true,
  },
  {
    id: "jsdelivr",
    name: "jsDelivr",
    icon: iconFor("jsdelivr.com"),
    latencyUrl: "https://cdn.jsdelivr.net/favicon.ico",
    tags: ["CDN", "Speedtest"],
    // A large, definitely-present, CORS-enabled (ACAO *) asset; workers loop it.
    speed: {
      kind: "fixed",
      url: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.asm.wasm",
    },
    builtIn: true,
  },
  {
    // CacheFly's public speed file does not reliably expose CORS, so it is
    // latency-only here (browsers can't read its body for throughput).
    id: "cachefly",
    name: "CacheFly",
    icon: iconFor("cachefly.com"),
    latencyUrl: "https://cachefly.cachefly.net/favicon.ico",
    tags: ["CDN"],
    builtIn: true,
  },

  // ---- AI ----
  {
    id: "openai",
    name: "OpenAI",
    icon: iconFor("openai.com"),
    latencyUrl: "https://openai.com/favicon.ico",
    tags: ["AI"],
    builtIn: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: iconFor("deepseek.com"),
    latencyUrl: "https://www.deepseek.com/favicon.ico",
    tags: ["AI", "CN"],
    builtIn: true,
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: iconFor("gemini.google.com"),
    latencyUrl: "https://gemini.google.com/favicon.ico",
    tags: ["AI", "Google"],
    builtIn: true,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    icon: iconFor("perplexity.ai"),
    latencyUrl: "https://www.perplexity.ai/favicon.ico",
    tags: ["AI"],
    builtIn: true,
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    icon: iconFor("huggingface.co"),
    latencyUrl: "https://huggingface.co/favicon.ico",
    tags: ["AI", "Dev"],
    builtIn: true,
  },

  // ---- Cloud ----
  {
    id: "aws",
    name: "AWS",
    icon: iconFor("aws.amazon.com"),
    latencyUrl: "https://aws.amazon.com/favicon.ico",
    tags: ["Cloud"],
    builtIn: true,
  },
  {
    id: "gcp",
    name: "Google Cloud",
    icon: iconFor("cloud.google.com"),
    latencyUrl: "https://cloud.google.com/favicon.ico",
    tags: ["Cloud", "Google"],
    builtIn: true,
  },
  {
    id: "azure",
    name: "Azure",
    icon: iconFor("azure.microsoft.com"),
    latencyUrl: "https://azure.microsoft.com/favicon.ico",
    tags: ["Cloud", "Microsoft"],
    builtIn: true,
  },
  {
    id: "ovh",
    name: "OVHcloud",
    icon: iconFor("ovhcloud.com"),
    latencyUrl: "https://www.ovhcloud.com/favicon.ico",
    tags: ["Cloud"],
    builtIn: true,
  },
  {
    id: "digitalocean",
    name: "DigitalOcean",
    icon: iconFor("digitalocean.com"),
    latencyUrl: "https://www.digitalocean.com/favicon.ico",
    tags: ["Cloud"],
    builtIn: true,
  },
  {
    id: "aliyun",
    name: "阿里云",
    icon: iconFor("aliyun.com"),
    latencyUrl: "https://www.aliyun.com/favicon.ico",
    tags: ["Cloud", "CN"],
    builtIn: true,
  },
  {
    id: "tencentcloud",
    name: "腾讯云",
    icon: iconFor("cloud.tencent.com"),
    latencyUrl: "https://cloud.tencent.com/favicon.ico",
    tags: ["Cloud", "CN"],
    builtIn: true,
  },

  // ---- Dev ----
  {
    id: "github",
    name: "GitHub",
    icon: iconFor("github.com"),
    latencyUrl: "https://github.com/favicon.ico",
    tags: ["Dev", "Microsoft"],
    builtIn: true,
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: iconFor("gitlab.com"),
    latencyUrl: "https://gitlab.com/favicon.ico",
    tags: ["Dev"],
    builtIn: true,
  },
  {
    id: "gitee",
    name: "Gitee",
    icon: iconFor("gitee.com"),
    latencyUrl: "https://gitee.com/favicon.ico",
    tags: ["Dev", "CN"],
    builtIn: true,
  },
  {
    id: "npm",
    name: "npm",
    icon: iconFor("npmjs.com"),
    latencyUrl: "https://www.npmjs.com/favicon.ico",
    tags: ["Dev"],
    builtIn: true,
  },

  // ---- Search ----
  {
    id: "google",
    name: "Google",
    icon: iconFor("google.com"),
    latencyUrl: "https://www.google.com/favicon.ico",
    tags: ["Search", "Google"],
    builtIn: true,
  },
  {
    id: "bing",
    name: "Bing",
    icon: iconFor("bing.com"),
    latencyUrl: "https://www.bing.com/favicon.ico",
    tags: ["Search", "Microsoft"],
    builtIn: true,
  },
  {
    id: "cn-bing",
    name: "Bing 国内",
    icon: iconFor("cn.bing.com"),
    latencyUrl: "https://cn.bing.com/favicon.ico",
    tags: ["Search", "Microsoft", "CN"],
    builtIn: true,
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    icon: iconFor("duckduckgo.com"),
    latencyUrl: "https://duckduckgo.com/favicon.ico",
    tags: ["Search"],
    builtIn: true,
  },

  // ---- Email ----
  {
    id: "outlook",
    name: "Outlook",
    icon: iconFor("outlook.com"),
    latencyUrl: "https://outlook.live.com/favicon.ico",
    tags: ["Email", "Microsoft"],
    builtIn: true,
  },

  // ---- Media ----
  {
    id: "youtube",
    name: "YouTube",
    icon: iconFor("youtube.com"),
    latencyUrl: "https://www.youtube.com/favicon.ico",
    tags: ["Media", "Google"],
    builtIn: true,
  },
  {
    id: "netflix",
    name: "Netflix",
    icon: iconFor("netflix.com"),
    latencyUrl: "https://www.netflix.com/favicon.ico",
    tags: ["Media"],
    builtIn: true,
  },
  {
    id: "spotify",
    name: "Spotify",
    icon: iconFor("spotify.com"),
    latencyUrl: "https://open.spotify.com/favicon.ico",
    tags: ["Media"],
    builtIn: true,
  },
  {
    id: "twitch",
    name: "Twitch",
    icon: iconFor("twitch.tv"),
    latencyUrl: "https://www.twitch.tv/favicon.ico",
    tags: ["Media"],
    builtIn: true,
  },
  {
    id: "apple-music",
    name: "Apple Music",
    icon: iconFor("music.apple.com"),
    latencyUrl: "https://music.apple.com/favicon.ico",
    tags: ["Media", "Apple"],
    builtIn: true,
  },
  {
    id: "douyin",
    name: "抖音",
    icon: iconFor("douyin.com"),
    latencyUrl: "https://www.douyin.com/favicon.ico",
    tags: ["Media", "CN"],
    builtIn: true,
  },

  // ---- Social ----
  {
    id: "x",
    name: "X (Twitter)",
    icon: iconFor("x.com"),
    latencyUrl: "https://x.com/favicon.ico",
    tags: ["Social"],
    builtIn: true,
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: iconFor("reddit.com"),
    latencyUrl: "https://www.reddit.com/favicon.ico",
    tags: ["Social"],
    builtIn: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: iconFor("facebook.com"),
    latencyUrl: "https://www.facebook.com/favicon.ico",
    tags: ["Social"],
    builtIn: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: iconFor("linkedin.com"),
    latencyUrl: "https://www.linkedin.com/favicon.ico",
    tags: ["Social", "Microsoft"],
    builtIn: true,
  },
  {
    id: "weibo",
    name: "微博",
    icon: iconFor("weibo.com"),
    latencyUrl: "https://weibo.com/favicon.ico",
    tags: ["Social", "CN"],
    builtIn: true,
  },

  // ---- Game ----
  {
    id: "steam",
    name: "Steam",
    icon: iconFor("steampowered.com"),
    latencyUrl: "https://store.steampowered.com/favicon.ico",
    tags: ["Game"],
    builtIn: true,
  },
  {
    id: "epic",
    name: "Epic Games",
    icon: iconFor("epicgames.com"),
    latencyUrl: "https://store.epicgames.com/favicon.ico",
    tags: ["Game"],
    builtIn: true,
  },

  // ---- Shop ----
  {
    id: "amazon",
    name: "Amazon",
    icon: iconFor("amazon.com"),
    latencyUrl: "https://www.amazon.com/favicon.ico",
    tags: ["Shop"],
    builtIn: true,
  },
  {
    id: "appstore",
    name: "App Store",
    icon: iconFor("apps.apple.com"),
    latencyUrl: "https://apps.apple.com/favicon.ico",
    tags: ["Shop", "Apple"],
    builtIn: true,
  },
  {
    id: "aliexpress",
    name: "AliExpress",
    icon: iconFor("aliexpress.com"),
    latencyUrl: "https://www.aliexpress.com/favicon.ico",
    tags: ["Shop", "CN"],
    builtIn: true,
  },
  {
    id: "taobao",
    name: "淘宝",
    icon: iconFor("taobao.com"),
    latencyUrl: "https://www.taobao.com/favicon.ico",
    tags: ["Shop", "CN"],
    builtIn: true,
  },
  {
    id: "jd",
    name: "京东",
    icon: iconFor("jd.com"),
    latencyUrl: "https://www.jd.com/favicon.ico",
    tags: ["Shop", "CN"],
    builtIn: true,
  },
  {
    id: "ebay",
    name: "eBay",
    icon: iconFor("ebay.com"),
    latencyUrl: "https://www.ebay.com/favicon.ico",
    tags: ["Shop"],
    builtIn: true,
  },
  {
    id: "shopify",
    name: "Shopify",
    icon: iconFor("shopify.com"),
    latencyUrl: "https://www.shopify.com/favicon.ico",
    tags: ["Shop"],
    builtIn: true,
  },

  // ---- CN ----
  {
    id: "wechat",
    name: "微信",
    icon: iconFor("weixin.qq.com"),
    latencyUrl: "https://res.wx.qq.com/favicon.ico",
    tags: ["Social", "CN"],
    builtIn: true,
  },
  {
    id: "baidu",
    name: "百度",
    icon: iconFor("baidu.com"),
    latencyUrl: "https://www.baidu.com/favicon.ico",
    tags: ["Search", "CN"],
    builtIn: true,
  },
  {
    id: "bilibili",
    name: "哔哩哔哩",
    icon: iconFor("bilibili.com"),
    latencyUrl: "https://www.bilibili.com/favicon.ico",
    tags: ["Media", "CN"],
    builtIn: true,
  },

  // ---- Extra speed sources (CORS-dependent; may fail in some networks) ----
  {
    id: "caiyun",
    name: "彩云（中国移动）",
    icon: iconFor("139.com"),
    latencyUrl: "https://img.mcloud.139.com/favicon.ico",
    tags: ["CN", "Speedtest"],
    speed: {
      kind: "fixed",
      url: "https://img.mcloud.139.com/material_prod/material_media/20221128/1669626861087.png",
    },
    builtIn: true,
  },
  {
    id: "steam-cf",
    name: "Steam · Cloudflare",
    icon: iconFor("steampowered.com"),
    latencyUrl: "https://cdn.cloudflare.steamstatic.com/favicon.ico",
    tags: ["Game", "CDN", "Speedtest"],
    speed: {
      kind: "fixed",
      url: "https://cdn.cloudflare.steamstatic.com/steam/apps/1063730/extras/NW_Sword_Sorcery_2.gif",
    },
    builtIn: true,
  },
  {
    id: "steam-akamai",
    name: "Steam · Akamai",
    icon: iconFor("steampowered.com"),
    latencyUrl: "https://cdn.akamai.steamstatic.com/favicon.ico",
    tags: ["Game", "CDN", "Speedtest"],
    speed: {
      kind: "fixed",
      url: "https://cdn.akamai.steamstatic.com/steam/apps/1063730/extras/NW_Sword_Sorcery_2.gif",
    },
    builtIn: true,
  },

  // ---- Infrastructure / CDN ----
  {
    id: "akamai",
    name: "Akamai",
    icon: iconFor("akamai.com"),
    latencyUrl: "https://www.akamai.com/favicon.ico",
    tags: ["CDN"],
    builtIn: true,
  },
  {
    id: "fastly",
    name: "Fastly",
    icon: iconFor("fastly.com"),
    latencyUrl: "https://www.fastly.com/favicon.ico",
    tags: ["CDN"],
    builtIn: true,
  },
  {
    id: "unpkg",
    name: "unpkg",
    icon: iconFor("unpkg.com"),
    latencyUrl: "https://unpkg.com/favicon.ico",
    tags: ["CDN", "Dev"],
    builtIn: true,
  },

  // ---- Microsoft services (grouped by function; vendor tag = Microsoft) ----
  {
    id: "office365",
    name: "Microsoft 365",
    icon: iconFor("office.com"),
    latencyUrl: "https://www.office.com/favicon.ico",
    tags: ["Cloud", "Microsoft"],
    builtIn: true,
  },

  // ---- Apple ----
  {
    id: "apple",
    name: "Apple",
    icon: iconFor("apple.com"),
    latencyUrl: "https://www.apple.com/favicon.ico",
    tags: ["Apple"],
    builtIn: true,
  },
  {
    id: "icloud",
    name: "iCloud",
    icon: iconFor("icloud.com"),
    latencyUrl: "https://www.icloud.com/favicon.ico",
    tags: ["Cloud", "Apple"],
    builtIn: true,
  },
  // ---- More popular sites ----
  { id: "discord", name: "Discord", icon: iconFor("discord.com"), latencyUrl: "https://discord.com/favicon.ico", tags: ["Social"], builtIn: true },
  { id: "instagram", name: "Instagram", icon: iconFor("instagram.com"), latencyUrl: "https://www.instagram.com/favicon.ico", tags: ["Social"], builtIn: true },
  { id: "whatsapp", name: "WhatsApp", icon: iconFor("whatsapp.com"), latencyUrl: "https://www.whatsapp.com/favicon.ico", tags: ["Social"], builtIn: true },
  { id: "zhihu", name: "知乎", icon: iconFor("zhihu.com"), latencyUrl: "https://www.zhihu.com/favicon.ico", tags: ["Social", "CN"], builtIn: true },
  { id: "qq", name: "QQ", icon: iconFor("qq.com"), latencyUrl: "https://www.qq.com/favicon.ico", tags: ["Social", "CN"], builtIn: true },
  { id: "yandex", name: "Yandex", icon: iconFor("yandex.com"), latencyUrl: "https://yandex.com/favicon.ico", tags: ["Search"], builtIn: true },
  { id: "dropbox", name: "Dropbox", icon: iconFor("dropbox.com"), latencyUrl: "https://www.dropbox.com/favicon.ico", tags: ["Cloud"], builtIn: true },
  { id: "vercel", name: "Vercel", icon: iconFor("vercel.com"), latencyUrl: "https://vercel.com/favicon.ico", tags: ["Dev", "Cloud"], builtIn: true },
  { id: "netlify", name: "Netlify", icon: iconFor("netlify.com"), latencyUrl: "https://www.netlify.com/favicon.ico", tags: ["Dev", "Cloud"], builtIn: true },
  { id: "paypal", name: "PayPal", icon: iconFor("paypal.com"), latencyUrl: "https://www.paypal.com/favicon.ico", tags: ["Bank"], builtIn: true },
  { id: "stripe", name: "Stripe", icon: iconFor("stripe.com"), latencyUrl: "https://stripe.com/favicon.ico", tags: ["Bank", "Dev"], builtIn: true },
  { id: "wikipedia", name: "Wikipedia", icon: iconFor("wikipedia.org"), latencyUrl: "https://www.wikipedia.org/favicon.ico", tags: ["Media"], builtIn: true },

  // Telegram data centres (pluto/venus/aurora/vesta/flora = DC1–5).
  ...(
    [
      ["1", "pluto"],
      ["2", "venus"],
      ["3", "aurora"],
      ["4", "vesta"],
      ["5", "flora"],
    ] as const
  ).map<NetworkTarget>(([dc, host]) => ({
    id: `tg-dc${dc}`,
    name: `Telegram DC${dc}`,
    icon: iconFor("telegram.org"),
    latencyUrl: `https://${host}.web.telegram.org/favicon.ico`,
    tags: ["Telegram", "Social"],
    builtIn: true,
  })),
];

/*
 * Known sites that DON'T work as latency targets in the browser and are
 * therefore intentionally left out (their favicon / endpoint refuses the
 * no-cors HEAD probe, returns nothing measurable, or is unreachable):
 *
 *   - mail.google.com (Gmail)      — favicon probe never resolves
 *   - stackoverflow.com            — blocks the probe (no response)
 *   - claude.ai                    — favicon probe returns nothing
 *
 * If you want to try one anyway, add it via the in-app "添加" form and see
 * whether it resolves in your network.
 */

/**
 * Built-ins served from the locally pre-fetched icon path. Defaults to
 * `/icons/<id>.png`; an svg/webp/ico override (registered in ICON_OVERRIDES by
 * `sync-icons`) is used as-is, so vector icons are served directly.
 */
export const PRESET_TARGETS: NetworkTarget[] = RAW_PRESETS.map((t) => ({
  ...t,
  icon: `/icons/${ICON_OVERRIDES[t.id] ?? `${t.id}.png`}`,
}));

/**
 * Sort: speed-capable targets first, then by tag priority, then by name.
 */
export function sortTargets(targets: NetworkTarget[]): NetworkTarget[] {
  return [...targets].sort((a, b) => {
    const speedDiff = Number(!!b.speed) - Number(!!a.speed);
    if (speedDiff !== 0) return speedDiff;
    const tagDiff = tagRank(a.tags) - tagRank(b.tags);
    if (tagDiff !== 0) return tagDiff;
    return a.name.localeCompare(b.name);
  });
}

export const THREAD_OPTIONS = [1, 2, 4, 8, 16] as const;

export const DEFAULT_SETTINGS: TestSettings = {
  latencyCount: 16,
  speedThreads: 4,
  speedDurationMs: 15_000,
  speedStopMB: null,
  speedRamp: false,
  monitorIntervalMs: 3_000,
};