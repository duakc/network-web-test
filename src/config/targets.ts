import { iconFor } from "@/lib/network/site";
import { CDN_DETECTED } from "@/config/cdn-detected";
import { ICON_OVERRIDES } from "@/config/icon-overrides";
import {
  akamaiPop,
  bunnyPop,
  bytedancePop,
  cacheflyPop,
  cdn77Pop,
  cdnetworksPop,
  cloudflarePop,
  cloudfrontPop,
  fastlyPop,
  ovhPop,
  zenlayerPop,
} from "@/config/cdn-probes";
import type { NetworkTarget, TestSettings } from "@/types";

/**
 * Built-in targets.
 *
 * Every probe detail is declared HERE, on the target: `latencyUrl` is the exact
 * URL we hit, and `latency` carries the method/mode/status overrides (default =
 * HEAD + no-cors). There is NO build-time endpoint rewriting — what you read is
 * what gets probed. Picking the endpoint follows a few rules of thumb:
 *   - Prefer a clean, lightweight, redirect-free 200: an official connectivity
 *     endpoint (generate_204), a static asset on the site's own CDN, or the
 *     origin root. Avoid `/favicon.ico` unless the root can't be probed cleanly
 *     (it 4xx/redirects) and the favicon is a direct 200.
 *   - Cloudflare-fronted sites probe `/cdn-cgi/trace` (GET): one request yields
 *     both the latency and the serving PoP (read by the mapper below).
 *   - A site whose endpoint sends `Access-Control-Allow-Origin` can use
 *     `mode: "cors"` to surface the real HTTP status in the probe tooltip.
 *
 * `speed` is only set for CORS-enabled endpoints (the only ones a browser can
 * measure throughput against). Built-in icons are served locally from
 * `/icons/<id>.png` (pre-fetched by `pnpm fetch-icons`); `iconFor` is a fallback.
 */
const RAW_PRESETS: NetworkTarget[] = [
  // ============================================================================
  // CDN — ordered by popularity (render order = file order). Cloudflare first,
  // since it's what most people test. Same-provider variants are kept adjacent.
  // ============================================================================

  // ---- Cloudflare (most-tested; kept at the head) ----
  // Enterprise (www.cloudflare.com) is the canonical Cloudflare test and carries
  // the speed endpoint. The other plans differ only by name + trace endpoint —
  // comparing the serving PoP/latency across tiers is the point. /cdn-cgi/trace
  // 404s to HEAD but 200s to GET, and its body carries the colo.
  {
    id: "cf-enterprise",
    name: "Cloudflare · Enterprise",
    icon: iconFor("cloudflare.com"),
    latencyUrl: "https://www.cloudflare.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["CDN", "Speedtest"],
    cloudflare: true,
    speed: {
      kind: "cloudflare",
      url: "https://speed.cloudflare.com/__down",
      uploadUrl: "https://speed.cloudflare.com/__up",
    },
    cdn: { popBody: true, popInfo: cloudflarePop },
    builtIn: true,
  },
  ...(
    [
      ["cf-free", "Cloudflare · Free", "noc.one"],
      ["cf-pro", "Cloudflare · Pro", "nodejs.org"],
      ["cf-business", "Cloudflare · Business", "mokeedev.com"],
      ["cf-spectrum", "Cloudflare · Spectrum", "gitlab.com"],
      ["cf-pages", "Cloudflare Pages", "www.pages.dev"],
    ] as const
  ).map<NetworkTarget>(([id, name, host]) => ({
    id,
    name,
    icon: iconFor("cloudflare.com"),
    latencyUrl: `https://${host}/cdn-cgi/trace`,
    latency: { method: "GET" },
    tags: ["CDN"],
    cloudflare: true,
    cdn: { popBody: true, popInfo: cloudflarePop },
    builtIn: true,
  })),

  // ---- Akamai (all three perfops edges kept together) ----
  {
    id: "akamai",
    name: "Akamai",
    icon: iconFor("akamai.com"),
    // perfops Akamai edge: the serving edge IP is in `x-cache2` → ip.sb ASN/geo.
    latencyUrl: "https://akamai-cdn.perfops.io/500b-bench.jpg",
    tags: ["CDN"],
    cdn: { popInfo: akamaiPop },
    builtIn: true,
  },
  {
    id: "akamai-media",
    name: "Akamai 媒体 CDN",
    icon: iconFor("akamai.com"),
    // perfops Akamai media (akamaized.net) edge — edge IP in `x-cache2`.
    latencyUrl: "https://perfopsrum.akamaized.net/500b-bench.jpg",
    tags: ["CDN", "Media"],
    cdn: { popInfo: akamaiPop },
    builtIn: true,
  },
  {
    id: "akamai-eip",
    name: "Akamai EIP",
    icon: iconFor("akamai.com"),
    // perfops Akamai Edge IP Binding edge — edge IP in `x-cache2`.
    latencyUrl: "https://perfopsrum-eip.akamaized.net/500b-bench.jpg",
    tags: ["CDN"],
    cdn: { popInfo: akamaiPop },
    builtIn: true,
  },

  // ---- Other CDNs (popularity order) ----
  {
    id: "cloudfront",
    name: "AWS CloudFront",
    icon: iconFor("aws.amazon.com"),
    // CloudFront edge that exposes the PoP via `X-Amz-Cf-Pop`.
    latencyUrl: "https://djlzvy5xcvhxt.cloudfront.net/500b-bench.jpg",
    tags: ["CDN"],
    cdn: { popInfo: cloudfrontPop },
    builtIn: true,
  },
  {
    id: "fastly",
    name: "Fastly",
    icon: iconFor("fastly.com"),
    // Fastly's anycast PoP endpoint exposes the node in `X-Served-By`.
    latencyUrl: "https://any.pops.fastly-analytics.com/",
    tags: ["CDN"],
    cdn: { popInfo: fastlyPop },
    builtIn: true,
  },
  {
    id: "gcp-cdn",
    name: "Google Cloud CDN",
    icon: iconFor("cloud.google.com"),
    // gstatic is Google's edge CDN; generate_204 is a purpose-built empty probe.
    // No CORS-readable PoP header, so latency-only.
    latencyUrl: "https://www.gstatic.com/generate_204",
    latency: { method: "GET" },
    tags: ["CDN", "Google"],
    builtIn: true,
  },
  {
    id: "azure-cdn",
    name: "Azure CDN",
    icon: iconFor("azure.microsoft.com"),
    // Microsoft Ajax CDN runs on Azure CDN; no CORS-readable PoP, so latency-only.
    latencyUrl: "https://ajax.aspnetcdn.com/ajax/jQuery/jquery-3.6.0.min.js",
    tags: ["CDN", "Microsoft"],
    builtIn: true,
  },
  {
    id: "jsdelivr",
    name: "jsDelivr",
    icon: iconFor("jsdelivr.com"),
    // Purpose-built latency-test package file (generate_200 → empty 200).
    latencyUrl: "https://cdn.jsdelivr.net/npm/latency-test@1.0.1/generate_200",
    tags: ["CDN", "Speedtest"],
    // A large, definitely-present, CORS-enabled (ACAO *) asset; workers loop it.
    speed: {
      kind: "fixed",
      url: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.asm.wasm",
    },
    builtIn: true,
  },
  {
    id: "unpkg",
    name: "unpkg",
    icon: iconFor("unpkg.com"),
    // unpkg is Cloudflare-fronted — the trace endpoint gives both latency + PoP.
    latencyUrl: "https://unpkg.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["CDN", "Dev"],
    builtIn: true,
  },
  {
    id: "cdn77",
    name: "CDN77",
    icon: iconFor("cdn77.com"),
    // This rsc.cdn77.org zone sets ACAO/ACEH `*`, exposing `X-77-Pop`.
    latencyUrl: "https://1596384882.rsc.cdn77.org/500b-bench.jpg",
    // ACAO * — read the real status in cors mode for richer probe feedback.
    latency: { mode: "cors", okStatus: [200] },
    tags: ["CDN"],
    cdn: { popInfo: cdn77Pop },
    builtIn: true,
  },
  {
    id: "bunny-standard",
    name: "Bunny CDN · Standard",
    icon: iconFor("bunny.net"),
    // test.b-cdn.net = Standard (edge) tier; Server header carries the PoP.
    latencyUrl: "https://test.b-cdn.net/",
    tags: ["CDN"],
    cdn: { popInfo: bunnyPop },
    builtIn: true,
  },
  {
    id: "bunny-volume",
    name: "Bunny CDN · Volume",
    icon: iconFor("bunny.net"),
    // testvideo.b-cdn.net = Volume tier (video network); distinct PoP routing.
    latencyUrl: "https://testvideo.b-cdn.net/",
    tags: ["CDN"],
    cdn: { popInfo: bunnyPop },
    builtIn: true,
  },
  {
    id: "cdnetworks",
    name: "网宿 CDNetworks",
    icon: iconFor("cdnetworks.com"),
    // PoP carried in the `X-Px` header (see cdn-probes.ts).
    latencyUrl: "https://cdnperf-rum.cdnetworks.net/500b-bench.jpg",
    tags: ["CDN", "CN"],
    cdn: { popInfo: cdnetworksPop },
    builtIn: true,
  },
  {
    id: "edgeone",
    name: "腾讯 EdgeOne",
    icon: iconFor("edgeone.ai"),
    latencyUrl: "https://eo-static-perfops2.qcloudcdn.com/500b-bench.jpg",
    latency: { method: "GET", okStatus: [200] },
    tags: ["CDN", "CN"],
    builtIn: true,
  },
  {
    id: "ovh-cdn",
    name: "OVH CDN",
    icon: iconFor("ovhcloud.com"),
    // perfops' OVH edge exposes `X-Cdn-Pop` (CORS *), so the PoP shows on the card.
    latencyUrl: "https://ovh-cdn.perfops.io/500b-bench.jpg",
    // CORS * — read the real status in cors mode for richer probe feedback.
    latency: { mode: "cors", okStatus: [200] },
    tags: ["CDN"],
    cdn: { popInfo: ovhPop },
    builtIn: true,
  },
  {
    id: "zenlayer",
    name: "Zenlayer CDN",
    icon: iconFor("zenlayer.com"),
    // PoP carried in the `Via` header (see cdn-probes.ts).
    latencyUrl: "https://test-perfops.ecn.zenlayer.net/500b-bench.jpg",
    tags: ["CDN"],
    cdn: { popInfo: zenlayerPop },
    builtIn: true,
  },
  {
    id: "bytedance",
    name: "字节跳动 CDN",
    icon: iconFor("bytedance.com"),
    // The CDN runs on a separate domain (perfops.byte-test.com) and reports its
    // PoP in the `Via` header — resolved by a bound probe in cdn-probes.ts.
    latencyUrl: "https://perfops.byte-test.com/500b-bench.jpg",
    tags: ["CDN", "CN"],
    cdn: { popInfo: bytedancePop },
    builtIn: true,
  },
  {
    // CacheFly's public speed file does not reliably expose CORS, so it is
    // latency-only here (browsers can't read its body for throughput).
    id: "cachefly",
    name: "CacheFly",
    icon: iconFor("cachefly.com"),
    // Perf endpoint carries the PoP in the `X-CF1` header.
    latencyUrl: "https://cdnperf.cachefly.net/500b-bench.jpg",
    tags: ["CDN"],
    cdn: { popInfo: cacheflyPop },
    builtIn: true,
  },
  {
    id: "alicdn",
    name: "阿里 CDN",
    icon: iconFor("alicdn.com"),
    // g.alicdn.com serves static assets with ACAO * — read the real status too.
    latencyUrl: "https://g.alicdn.com/favicon.ico",
    latency: { mode: "cors", okStatus: [200] },
    tags: ["CDN", "CN", "Speedtest"],
    // g.alicdn.com serves static assets with ACAO *, so throughput is measurable.
    speed: {
      kind: "fixed",
      url: "https://g.alicdn.com/code/lib/jquery/3.6.0/jquery.min.js",
    },
    builtIn: true,
  },

  // ---- AI ----
  {
    id: "openai",
    name: "OpenAI",
    icon: iconFor("openai.com"),
    // Cloudflare-fronted — the trace endpoint gives both latency + PoP.
    latencyUrl: "https://openai.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["AI"],
    cdn: { popBody: true, popInfo: cloudflarePop },
    builtIn: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: iconFor("deepseek.com"),
    latencyUrl: "https://www.deepseek.com",
    tags: ["AI", "CN"],
    builtIn: true,
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: iconFor("gemini.google.com"),
    // The Gemini app 403s favicon/root cross-origin; generate_204 is a clean 204.
    latencyUrl: "https://gemini.google.com/generate_204",
    latency: { method: "GET" },
    tags: ["AI", "Google"],
    builtIn: true,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    icon: iconFor("perplexity.ai"),
    latencyUrl: "https://www.perplexity.ai/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["AI"],
    builtIn: true,
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    icon: iconFor("huggingface.co"),
    latencyUrl: "https://huggingface.co/",
    tags: ["AI", "Dev"],
    builtIn: true,
  },

  // ---- Cloud ----
  {
    id: "aws",
    name: "AWS",
    icon: iconFor("aws.amazon.com"),
    // aws.amazon.com geo-redirects (302) to a regional site, doubling the RTT.
    // a0.awsstatic.com is AWS's global static-asset CDN with no geo logic.
    latencyUrl: "https://a0.awsstatic.com/libra-css/images/site/touch-icon-ipad-144-smile.png",
    tags: ["Cloud"],
    builtIn: true,
  },
  {
    id: "gcp",
    name: "Google Cloud",
    icon: iconFor("cloud.google.com"),
    latencyUrl: "https://cloud.google.com/generate_204",
    latency: { method: "GET" },
    tags: ["Cloud", "Google"],
    builtIn: true,
  },
  // Azure (the cloud) is intentionally omitted: azure.microsoft.com only answers
  // via a slow locale redirect, and its clean endpoint is www.microsoft.com — the
  // same Azure/Akamai edge already represented by Microsoft 365 / Azure CDN.
  {
    id: "digitalocean",
    name: "DigitalOcean",
    icon: iconFor("digitalocean.com"),
    // Cloudflare-fronted — trace gives both latency + PoP.
    latencyUrl: "https://www.digitalocean.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["Cloud"],
    builtIn: true,
  },
  {
    id: "aliyun",
    name: "阿里云",
    icon: iconFor("aliyun.com"),
    latencyUrl: "https://www.aliyun.com/",
    tags: ["Cloud", "CN"],
    builtIn: true,
  },
  {
    id: "tencentcloud",
    name: "腾讯云",
    icon: iconFor("cloud.tencent.com"),
    latencyUrl: "https://cloud.tencent.com/",
    tags: ["Cloud", "CN"],
    builtIn: true,
  },

  // ---- Dev ----
  {
    id: "github",
    name: "GitHub",
    icon: iconFor("github.com"),
    // A small static asset on github.github.io (GitHub Pages) — a clean 200 that
    // avoids hammering github.com's root.
    latencyUrl: "https://github.github.io/janky/images/bg_hr.png",
    tags: ["Dev", "Microsoft"],
    builtIn: true,
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: iconFor("gitlab.com"),
    latencyUrl: "https://gitlab.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["Dev"],
    builtIn: true,
  },
  {
    id: "gitee",
    name: "Gitee",
    icon: iconFor("gitee.com"),
    // gitee.com/ is a heavy dynamic page; the static favicon is a lighter probe.
    latencyUrl: "https://gitee.com/favicon.ico",
    tags: ["Dev", "CN"],
    builtIn: true,
  },
  {
    id: "npm",
    name: "npm",
    icon: iconFor("npmjs.com"),
    latencyUrl: "https://www.npmjs.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["Dev"],
    builtIn: true,
  },

  // ---- Search ----
  {
    id: "google",
    name: "Google",
    icon: iconFor("google.com"),
    // Android connectivity-check endpoint — purpose-built, un-rate-limited 204.
    latencyUrl: "https://connectivitycheck.gstatic.com/generate_204",
    latency: { method: "GET" },
    tags: ["Search", "Google"],
    builtIn: true,
  },
  {
    id: "bing",
    name: "Bing",
    icon: iconFor("bing.com"),
    latencyUrl: "https://www.bing.com/",
    tags: ["Search", "Microsoft"],
    builtIn: true,
  },
  {
    id: "cn-bing",
    name: "Bing 国内",
    icon: iconFor("cn.bing.com"),
    latencyUrl: "https://cn.bing.com/",
    tags: ["Search", "Microsoft", "CN"],
    builtIn: true,
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    icon: iconFor("duckduckgo.com"),
    latencyUrl: "https://duckduckgo.com/",
    tags: ["Search"],
    builtIn: true,
  },

  // ---- Media ----
  {
    id: "youtube",
    name: "YouTube",
    icon: iconFor("youtube.com"),
    // yt3.ggpht.com is YouTube's avatar/asset CDN — a clean fast favicon 200.
    latencyUrl: "https://yt3.ggpht.com/favicon.ico",
    tags: ["Media", "Google"],
    builtIn: true,
  },
  {
    id: "netflix",
    name: "Netflix",
    icon: iconFor("netflix.com"),
    // www.netflix.com 302-redirects to a regional path; assets.nflxext.com is its
    // static asset CDN — a clean direct 200 (GET only — it rejects HEAD).
    latencyUrl: "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
    latency: { method: "GET" },
    tags: ["Media"],
    builtIn: true,
  },
  {
    id: "spotify",
    name: "Spotify",
    icon: iconFor("spotify.com"),
    latencyUrl: "https://open.spotify.com/",
    tags: ["Media"],
    builtIn: true,
  },
  {
    id: "twitch",
    name: "Twitch",
    icon: iconFor("twitch.tv"),
    // Root rejects HEAD (405); GET answers 200.
    latencyUrl: "https://www.twitch.tv/",
    latency: { method: "GET" },
    tags: ["Media"],
    builtIn: true,
  },
  {
    id: "douyin",
    name: "抖音",
    icon: iconFor("douyin.com"),
    latencyUrl: "https://www.douyin.com/",
    latency: { method: "GET" },
    tags: ["Media", "CN"],
    builtIn: true,
  },

  // ---- Social ----
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

  // ---- Game ----
  // Steam store (store.steampowered.com) is omitted: it rate-limits the repeated
  // probe. The Steam CDN edges (steam-cf / steam-akamai) below are kept.
  {
    id: "epic",
    name: "Epic Games",
    icon: iconFor("epicgames.com"),
    latencyUrl: "https://store.epicgames.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["Game"],
    builtIn: true,
  },

  // ---- Shop ----
  {
    id: "amazon",
    name: "Amazon",
    icon: iconFor("amazon.com"),
    // Root rejects HEAD (405); GET answers 200.
    latencyUrl: "https://www.amazon.com/",
    latency: { method: "GET" },
    tags: ["Shop"],
    builtIn: true,
  },
  {
    id: "aliexpress",
    name: "AliExpress",
    icon: iconFor("aliexpress.com"),
    latencyUrl: "https://www.aliexpress.com/",
    tags: ["Shop", "CN"],
    builtIn: true,
  },
  {
    id: "taobao",
    name: "淘宝",
    icon: iconFor("taobao.com"),
    latencyUrl: "https://www.taobao.com/",
    tags: ["Shop", "CN"],
    builtIn: true,
  },
  {
    id: "jd",
    name: "京东",
    icon: iconFor("jd.com"),
    latencyUrl: "https://www.jd.com/",
    tags: ["Shop", "CN"],
    builtIn: true,
  },
  {
    id: "ebay",
    name: "eBay",
    icon: iconFor("ebay.com"),
    // www.ebay.com/ root is ~3× slower than its favicon — use the fast static 200.
    latencyUrl: "https://www.ebay.com/favicon.ico",
    tags: ["Shop"],
    builtIn: true,
  },
  {
    id: "shopify",
    name: "Shopify",
    icon: iconFor("shopify.com"),
    latencyUrl: "https://www.shopify.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["Shop"],
    builtIn: true,
  },

  // ---- CN ----
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
    id: "baidu",
    name: "百度",
    icon: iconFor("baidu.com"),
    latencyUrl: "https://www.baidu.com/",
    tags: ["Search", "CN"],
    builtIn: true,
  },
  {
    id: "bilibili",
    name: "哔哩哔哩",
    icon: iconFor("bilibili.com"),
    latencyUrl: "https://www.bilibili.com/",
    tags: ["Media", "CN"],
    builtIn: true,
  },

  // ---- Extra speed sources (CORS-dependent; may fail in some networks) ----
  {
    id: "steam-cf",
    name: "Steam · Cloudflare",
    icon: iconFor("steampowered.com"),
    latencyUrl: "https://cdn.cloudflare.steamstatic.com",
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
    latencyUrl: "https://cdn.akamai.steamstatic.com",
    tags: ["Game", "CDN", "Speedtest"],
    speed: {
      kind: "fixed",
      url: "https://cdn.akamai.steamstatic.com/steam/apps/1063730/extras/NW_Sword_Sorcery_2.gif",
    },
    builtIn: true,
  },

  // ---- Microsoft services (grouped by function; vendor tag = Microsoft) ----
  {
    id: "office365",
    name: "Microsoft 365",
    icon: iconFor("office.com"),
    // favicon 405s; the origin root answers HEAD 200.
    latencyUrl: "https://www.office.com/",
    tags: ["Cloud", "Microsoft"],
    builtIn: true,
  },

  // ---- Apple ----
  {
    id: "apple",
    name: "Apple",
    icon: iconFor("apple.com"),
    // captive.apple.com is Apple's captive-portal check — a clean lightweight 200,
    // and the same edge every Apple service rides.
    latencyUrl: "https://captive.apple.com/",
    tags: ["Apple"],
    builtIn: true,
  },

  // ---- More popular sites ----
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
  {
    id: "yandex",
    name: "Yandex",
    icon: iconFor("yandex.com"),
    latencyUrl: "https://yandex.com/",
    tags: ["Search"],
    builtIn: true,
  },
  {
    id: "vercel",
    name: "Vercel",
    icon: iconFor("vercel.com"),
    latencyUrl: "https://vercel.com/",
    tags: ["Dev", "Cloud"],
    builtIn: true,
  },
  {
    id: "netlify",
    name: "Netlify",
    icon: iconFor("netlify.com"),
    latencyUrl: "https://www.netlify.com/",
    tags: ["Dev", "Cloud"],
    builtIn: true,
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    icon: iconFor("wikipedia.org"),
    latencyUrl: "https://www.wikipedia.org/",
    tags: ["Media"],
    builtIn: true,
  },

  // ---- Bank / Payments ----
  {
    id: "visa",
    name: "Visa",
    icon: iconFor("visa.com"),
    // Cloudflare-fronted — trace gives both latency + PoP.
    latencyUrl: "https://www.visa.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["Bank"],
    builtIn: true,
  },

  // ---- Dev / Productivity ----
  {
    id: "notion",
    name: "Notion",
    icon: iconFor("notion.so"),
    // /favicon.ico 404s and the root is a heavy bot-protected SPA; /images/favicon.ico
    // is a clean direct 200.
    latencyUrl: "https://www.notion.so/images/favicon.ico",
    tags: ["Dev"],
    builtIn: true,
  },
  {
    id: "figma",
    name: "Figma",
    icon: iconFor("figma.com"),
    latencyUrl: "https://www.figma.com/",
    tags: ["Dev"],
    builtIn: true,
  },
  {
    id: "slack",
    name: "Slack",
    icon: iconFor("slack.com"),
    // slack.com/favicon.ico 302-redirects to the slack-edge CDN; probe that static
    // asset directly (clean 200, no redirect).
    latencyUrl: "https://a.slack-edge.com/cebaa/img/ico/favicon.ico",
    tags: ["Dev"],
    builtIn: true,
  },
  {
    id: "canva",
    name: "Canva",
    icon: iconFor("canva.com"),
    latencyUrl: "https://www.canva.com/cdn-cgi/trace",
    latency: { method: "GET" },
    tags: ["Dev"],
    builtIn: true,
  },
  {
    id: "trello",
    name: "Trello",
    icon: iconFor("trello.com"),
    latencyUrl: "https://trello.com/",
    tags: ["Dev"],
    builtIn: true,
  },

  // Telegram data centres (pluto/venus/aurora/vesta/flora = DC1–5). HTTP probes
  // 403 here, so we measure the DC's WebSocket endpoint instead — the probe
  // layer dispatches on the wss:// scheme and times the handshake.
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
    latencyUrl: `wss://${host}.web.telegram.org/apiws`,
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
 * Targets that reuse another target's icon instead of fetching their own
 * (e.g. the Akamai media CDN shares the Akamai logo).
 */
const ICON_ALIAS: Record<string, string> = {
  "akamai-media": "akamai",
  "akamai-eip": "akamai",
  // OVH CDN reuses the (sharp) OVHcloud icon rather than fetching its own.
  "ovh-cdn": "ovh",
  // Cloudflare plan tiers all share the Cloudflare logo.
  "cf-free": "cloudflare",
  "cf-pro": "cloudflare",
  "cf-business": "cloudflare",
  "cf-enterprise": "cloudflare",
  "cf-spectrum": "cloudflare",
  "cf-pages": "cloudflare",
  // GCP/Azure CDN reuse the existing Google Cloud / Azure icons.
  "gcp-cdn": "gcp",
  "azure-cdn": "azure",
};

/**
 * Finalize each built-in. This is a pure data join — it does NOT touch the probe
 * endpoints (those are declared on the target above). It only:
 *   - resolves the locally pre-fetched icon path;
 *   - attaches the offline-detected CDN *vendor* (Google DoH → ip.sb ASN), a
 *     location-independent label safe to show even when no live PoP header is
 *     CORS-readable. China sites are exempt — their domestic multi-CDN routing
 *     makes a single ASN unreliable (e.g. bilibili → an overseas Zenlayer node) —
 *     unless the target itself is a dedicated CDN test (CDN tag or its own probe);
 *   - for Cloudflare-fronted sites that probe `/cdn-cgi/trace`, attaches the live
 *     PoP resolver that reads the colo from that same response. A Cloudflare site
 *     pinned off trace (e.g. Discord, whose WAF 403s trace cross-origin) gets no
 *     live probe and just shows the vendor label.
 * Custom targets carry no `cdnVendor` and resolve their CDN live, per user.
 */
export const PRESET_TARGETS: NetworkTarget[] = RAW_PRESETS.map((t) => {
  const iconId = ICON_ALIAS[t.id] ?? t.id;
  const icon = `/icons/${ICON_OVERRIDES[iconId] ?? `${iconId}.png`}`;

  const isCdnTarget = !!t.cdn || t.tags.includes("CDN");
  const vendor =
    t.tags.includes("CN") && !isCdnTarget ? undefined : CDN_DETECTED[t.id];
  const cloudflare = t.cloudflare ?? vendor === "cloudflare";

  const cdn =
    t.cdn ??
    (cloudflare && /\/cdn-cgi\/trace$/.test(t.latencyUrl)
      ? { popBody: true, popInfo: cloudflarePop }
      : undefined);

  return { ...t, icon, cdn, cdnVendor: vendor, cloudflare };
});

/**
 * Render order IS the file order: targets appear in the order they are declared
 * in `RAW_PRESETS` (custom targets after the built-ins). Ranking — e.g. CDNs by
 * popularity, Cloudflare first — is done by ordering the array above, not by a
 * sort key. The grouped view still buckets by `TAG_ORDER`, preserving this order
 * within each group.
 */
export function sortTargets(targets: NetworkTarget[]): NetworkTarget[] {
  return targets;
}

export const THREAD_OPTIONS = [1, 2, 4, 8, 16] as const;

export const DEFAULT_SETTINGS: TestSettings = {
  latencyCount: 16,
  speedThreads: 4,
  speedLimitMode: "time",
  speedDurationMs: 15_000,
  speedStopMB: 300,
  speedRamp: false,
  monitorIntervalMs: 3_000,
  speedDirection: "down",
};