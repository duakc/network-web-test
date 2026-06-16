import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

/**
 * Linode (Akamai Connected Cloud) regions — latency to each region's official
 * speedtest mirror (`speedtest.<region>.linode.com/100MB-<region>.bin`). The
 * default HEAD/no-cors probe times the round trip (HEAD returns headers only —
 * it never pulls the 100 MB body). These mirrors send NO CORS/Timing-Allow-Origin
 * header, so a browser can't read their bytes cross-origin → latency only. Ordered
 * by great-circle distance from northern China (Beijing) — nearer first.
 */
export const LINODE_TARGETS: NetworkTarget[] = (
  [
    ["osaka", "大阪"],
    ["tokyo2", "东京"],
    ["singapore", "新加坡"],
    ["mumbai1", "孟买"],
    ["chennai", "金奈"],
    ["jakarta", "雅加达"],
    ["stockholm", "斯德哥尔摩"],
    ["amsterdam", "阿姆斯特丹"],
    ["frankfurt", "法兰克福"],
    ["milan", "米兰"],
    ["london", "伦敦"],
    ["paris", "巴黎"],
    ["seattle", "西雅图"],
    ["madrid", "马德里"],
    ["fremont", "弗里蒙特"],
    ["toronto1", "多伦多"],
    ["chicago", "芝加哥"],
    ["dallas", "达拉斯"],
    ["newark", "纽瓦克"],
    ["washington", "华盛顿"],
    ["atlanta", "亚特兰大"],
    ["miami", "迈阿密"],
    ["sao-paulo", "圣保罗"],
  ] as const
).map<NetworkTarget>(([region, city]) => ({
  id: `linode-${region}`,
  name: `Linode ${city}`,
  icon: iconFor("linode.com"),
  latencyUrl: `https://speedtest.${region}.linode.com/100MB-${region}.bin`,
  tags: ["Linode"],
  builtIn: true,
}));
