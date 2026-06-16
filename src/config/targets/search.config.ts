import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

export const SEARCH_TARGETS: NetworkTarget[] = [
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
  {
    id: "yandex",
    name: "Yandex",
    icon: iconFor("yandex.com"),
    latencyUrl: "https://yandex.com/",
    tags: ["Search"],
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
];
