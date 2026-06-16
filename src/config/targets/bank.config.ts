import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

export const BANK_TARGETS: NetworkTarget[] = [
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
];
