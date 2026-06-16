import { iconFor } from "@/lib/network/site";
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
import type { NetworkTarget } from "@/types";

/**
 * CDN test sources — ordered by popularity (render order = file order). Cloudflare
 * first, since it's what most people test; same-provider variants kept adjacent.
 * Most expose a serving-PoP header read by a bound `popInfo` resolver.
 */
export const CDN_TARGETS: NetworkTarget[] = [
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
    tags: ["CDN", "AWS"],
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
    tags: ["CDN", "Google", "GCP"],
    builtIn: true,
  },
  {
    id: "azure-cdn",
    name: "Azure CDN",
    icon: iconFor("azure.microsoft.com"),
    // Microsoft Ajax CDN runs on Azure CDN; no CORS-readable PoP, so latency-only.
    latencyUrl: "https://ajax.aspnetcdn.com/ajax/jQuery/jquery-3.6.0.min.js",
    tags: ["CDN", "Microsoft", "Azure"],
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
    tags: ["CDN", "CN", "Tencent"],
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
    tags: ["CDN", "CN", "Speedtest", "Aliyun"],
    // g.alicdn.com serves static assets with ACAO *, so throughput is measurable.
    speed: {
      kind: "fixed",
      url: "https://g.alicdn.com/code/lib/jquery/3.6.0/jquery.min.js",
    },
    builtIn: true,
  },
];
