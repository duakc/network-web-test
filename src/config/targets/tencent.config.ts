import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

/**
 * 腾讯云 COS regions via CloudPing (feitsui's public-benefit buckets). Probed with
 * the default HEAD/no-cors fetch — no CORS needed. Mainland-China regions carry the
 * CN tag; `maxLatencyCount: 16` (volunteer-funded; see Special Thanks). Icon
 * resolves via REGION_ICON (→ tencentcloud).
 */
export const TENCENT_TARGETS: NetworkTarget[] = (
  [
    ["ap-beijing", "bjs", "北京", true],
    ["ap-beijing-fsi", "bjs-fsi", "北京金融", true],
    ["ap-shanghai", "sha", "上海", true],
    ["ap-shanghai-fsi", "sha-fsi", "上海金融", true],
    ["ap-nanjing", "nkg", "南京", true],
    ["ap-chengdu", "ctu", "成都", true],
    ["ap-chongqing", "ckg", "重庆", true],
    ["ap-guangzhou", "can", "广州", true],
    ["ap-shenzhen-fsi", "szx-fsi", "深圳金融", true],
    ["ap-hongkong", "hkg", "香港"],
    ["ap-seoul", "icn", "首尔"],
    ["ap-tokyo", "nrt", "东京"],
    ["ap-singapore", "sin", "新加坡"],
    ["ap-bangkok", "bkk", "曼谷"],
    ["ap-jakarta", "cgk", "雅加达"],
    ["eu-frankfurt", "fra", "法兰克福"],
    ["na-siliconvalley", "siliconvalley", "硅谷"],
    ["na-ashburn", "iad", "阿什本"],
    ["sa-saopaulo", "gru", "圣保罗"],
  ] as const
).map<NetworkTarget>(([region, bucket, city, cn]) => ({
  id: `tencent-${region}`,
  name: `腾讯云 ${city}`,
  icon: iconFor("cloud.tencent.com"),
  latencyUrl: `https://feitsui-${bucket}-1251417183.cos.${region}.myqcloud.com/ping.html`,
  tags: cn ? ["Tencent", "CN"] : ["Tencent"],
  maxLatencyCount: 16,
  // <img> sends no Origin, so COS answers 200 (a cross-origin fetch would 403).
  latency: { transport: "img" },
  builtIn: true,
}));
