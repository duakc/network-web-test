import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

export const SHOP_TARGETS: NetworkTarget[] = [
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
];
