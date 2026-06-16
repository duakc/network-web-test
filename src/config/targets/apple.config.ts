import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

export const APPLE_TARGETS: NetworkTarget[] = [
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
];
