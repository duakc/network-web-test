import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

/**
 * 百度智能云 BOS regions via CloudPing (feitsui's public-benefit buckets). Probed
 * with the default HEAD/no-cors fetch — no CORS needed. Mainland-China regions
 * carry the CN tag; `maxLatencyCount: 16` (volunteer-funded; see Special Thanks).
 * Icon resolves via REGION_ICON (→ baidu).
 */
export const BAIDU_TARGETS: NetworkTarget[] = (
  [
    ["bj", "beijing", "北京", true],
    ["bd", "baoding", "保定", true],
    ["su", "suzhou", "苏州", true],
    ["fwh", "wuhan", "武汉", true],
    ["fsh", "shanghai", "上海", true],
    ["gz", "guangzhou", "广州", true],
    ["hkg", "hkg", "香港"],
    ["sin", "sin", "新加坡"],
  ] as const
).map<NetworkTarget>(([region, bucket, city, cn]) => ({
  id: `baidu-${region}`,
  name: `百度云 ${city}`,
  icon: iconFor("baidu.com"),
  latencyUrl: `https://feitsui-${bucket}.${region}.bcebos.com/ping.html`,
  tags: cn ? ["Baidu", "CN"] : ["Baidu"],
  maxLatencyCount: 16,
  // <img> sends no Origin, so BOS answers 200 (a cross-origin fetch would 403).
  latency: { transport: "img" },
  builtIn: true,
}));
