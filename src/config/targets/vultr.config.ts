import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

/**
 * Vultr regions — each region's official looking-glass node (`<code>-ping.vultr.com`).
 * Unlike AWS/Linode these mirrors send CORS + serve an incompressible
 * `vultr.com.1000MB.bin`, so they're BOTH latency probes (default HEAD/no-cors
 * against the node root) AND measurable speed sources. Ordered by great-circle
 * distance from northern China (Beijing) — nearer first.
 */
export const VULTR_TARGETS: NetworkTarget[] = (
  [
    ["hnd-jp", "东京"],
    ["del-in", "德里"],
    ["sgp", "新加坡"],
    ["bom-in", "孟买"],
    ["blr-in", "班加罗尔"],
    ["sto-se", "斯德哥尔摩"],
    ["tlv-il", "特拉维夫"],
    ["waw-pl", "华沙"],
    ["ams-nl", "阿姆斯特丹"],
    ["fra-de", "法兰克福"],
    ["lon-gb", "伦敦"],
    ["par-fr", "巴黎"],
    ["wa-us", "西雅图"],
    ["syd-au", "悉尼"],
    ["mel-au", "墨尔本"],
    ["mad-es", "马德里"],
    ["sjo-ca-us", "硅谷"],
    ["lax-ca-us", "洛杉矶"],
    ["il-us", "芝加哥"],
    ["tx-us", "达拉斯"],
    ["nj-us", "新泽西"],
    ["jnb-za", "约翰内斯堡"],
    ["sao-br", "圣保罗"],
  ] as const
).map<NetworkTarget>(([code, city]) => ({
  id: `vultr-${code}`,
  name: `Vultr ${city}`,
  icon: iconFor("vultr.com"),
  latencyUrl: `https://${code}-ping.vultr.com/`,
  tags: ["Vultr"],
  speed: {
    kind: "fixed",
    url: `https://${code}-ping.vultr.com/vultr.com.1000MB.bin`,
  },
  builtIn: true,
}));
