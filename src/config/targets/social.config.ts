import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

export const SOCIAL_TARGETS: NetworkTarget[] = [
  {
    id: "x",
    name: "X (Twitter)",
    icon: iconFor("x.com"),
    latencyUrl: "https://x.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["Social"],
    builtIn: true,
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: iconFor("reddit.com"),
    latencyUrl: "https://www.reddit.com/",
    tags: ["Social"],
    builtIn: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: iconFor("facebook.com"),
    // facebook.com/ 400s cross-origin; the favicon is a direct 200.
    latencyUrl: "https://www.facebook.com/favicon.ico",
    tags: ["Social"],
    builtIn: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: iconFor("linkedin.com"),
    latencyUrl: "https://www.linkedin.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["Social", "Microsoft"],
    builtIn: true,
  },
  {
    id: "weibo",
    name: "微博",
    icon: iconFor("weibo.com"),
    // weibo.com/ 302-redirects; the favicon is a direct 200 (no extra hop).
    latencyUrl: "https://weibo.com/favicon.ico",
    tags: ["Social", "CN"],
    builtIn: true,
  },
  {
    id: "wechat",
    name: "微信",
    icon: iconFor("weixin.qq.com"),
    // res.wx.qq.com is WeChat's static asset host; this versioned ico is a fast 200.
    latencyUrl: "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico",
    tags: ["Social", "CN"],
    builtIn: true,
  },
  {
    id: "discord",
    name: "Discord",
    icon: iconFor("discord.com"),
    // Discord's WAF 403s /cdn-cgi/trace cross-origin, so the usual Cloudflare
    // trace probe can't be used (latency or PoP). The origin root answers HEAD
    // 200; the CDN still labels "Cloudflare" from the offline-detected vendor.
    latencyUrl: "https://discord.com/",
    tags: ["Social"],
    builtIn: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: iconFor("instagram.com"),
    latencyUrl: "https://www.instagram.com/",
    tags: ["Social"],
    builtIn: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: iconFor("whatsapp.com"),
    // www.whatsapp.com 400s every cross-origin request; web.whatsapp.com's favicon
    // is a clean direct 200.
    latencyUrl: "https://web.whatsapp.com/favicon.ico",
    tags: ["Social"],
    builtIn: true,
  },
  {
    id: "zhihu",
    name: "知乎",
    icon: iconFor("zhihu.com"),
    // www.zhihu.com 302-redirects to /signin; static.zhihu.com is a fast 200.
    latencyUrl: "https://static.zhihu.com/heifetz/favicon.ico",
    tags: ["Social", "CN"],
    builtIn: true,
  },
  {
    id: "qq",
    name: "QQ",
    icon: iconFor("qq.com"),
    latencyUrl: "https://www.qq.com/",
    tags: ["Social", "CN"],
    builtIn: true,
  },
];
