import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

export const MEDIA_TARGETS: NetworkTarget[] = [
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
  {
    id: "bilibili",
    name: "哔哩哔哩",
    icon: iconFor("bilibili.com"),
    latencyUrl: "https://www.bilibili.com/",
    tags: ["Media", "CN"],
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
];
