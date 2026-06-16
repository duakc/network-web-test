import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

export const CLOUD_TARGETS: NetworkTarget[] = [
  {
    id: "aws",
    name: "AWS",
    icon: iconFor("aws.amazon.com"),
    // aws.amazon.com geo-redirects (302) to a regional site, doubling the RTT.
    // a0.awsstatic.com is AWS's global static-asset CDN with no geo logic.
    latencyUrl: "https://a0.awsstatic.com/libra-css/images/site/touch-icon-ipad-144-smile.png",
    tags: ["Cloud", "AWS"],
    builtIn: true,
  },
  {
    id: "gcp",
    name: "Google Cloud",
    icon: iconFor("cloud.google.com"),
    latencyUrl: "https://cloud.google.com/generate_204",
    latency: { method: "GET" },
    tags: ["Cloud", "Google", "GCP"],
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
    tags: ["Cloud", "CN", "Aliyun"],
    builtIn: true,
  },
  {
    id: "tencentcloud",
    name: "腾讯云",
    icon: iconFor("cloud.tencent.com"),
    latencyUrl: "https://cloud.tencent.com/",
    tags: ["Cloud", "CN", "Tencent"],
    builtIn: true,
  },
  {
    id: "office365",
    name: "Microsoft 365",
    icon: iconFor("office.com"),
    // favicon 405s; the origin root answers HEAD 200.
    latencyUrl: "https://www.office.com/",
    tags: ["Cloud", "Microsoft"],
    builtIn: true,
  },
];
