import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

export const DEV_TARGETS: NetworkTarget[] = [
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
];
