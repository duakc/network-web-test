import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

export const GAME_TARGETS: NetworkTarget[] = [
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
  // Steam CDN edges (CORS-dependent; may fail in some networks) — speed sources.
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
];
