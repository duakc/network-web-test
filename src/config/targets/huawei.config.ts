import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

/**
 * 华为云 OBS regions via CloudPing (feitsui's public-benefit buckets). Probed with
 * the default HEAD/no-cors fetch — no CORS needed. Mainland-China regions carry the
 * CN tag; `maxLatencyCount: 16` (volunteer-funded; see Special Thanks). Icon
 * resolves via REGION_ICON (→ huaweicloud).
 */
export const HUAWEI_TARGETS: NetworkTarget[] = (
  [
    ["cn-north-1", "pek1", "北京一", true],
    ["cn-north-4", "pek4", "北京四", true],
    ["cn-north-9", "ucb", "乌兰察布", true],
    ["cn-east-2", "sha2", "上海二", true],
    ["cn-east-3", "sha1", "上海一", true],
    ["cn-south-1", "can", "广州", true],
    ["cn-southwest-2", "kwe1", "贵阳", true],
    ["ap-southeast-1", "hkg", "香港"],
    ["ap-southeast-3", "sin", "新加坡"],
    ["ap-southeast-2", "bkk", "曼谷"],
    ["af-south-1", "jnb", "约翰内斯堡"],
    ["sa-brazil-1", "gru1", "圣保罗"],
    ["la-south-2", "scl", "圣地亚哥"],
    ["la-north-2", "mex2", "墨西哥"],
    ["na-mexico-1", "mex1", "墨西哥城"],
  ] as const
).map<NetworkTarget>(([region, bucket, city, cn]) => ({
  id: `huawei-${region}`,
  name: `华为云 ${city}`,
  icon: iconFor("huaweicloud.com"),
  latencyUrl: `https://feitsui-${bucket}.obs.${region}.myhuaweicloud.com/ping.html`,
  tags: cn ? ["Huawei", "CN"] : ["Huawei"],
  maxLatencyCount: 16,
  // <img> sends no Origin, so OBS answers 200 (a cross-origin fetch would 403).
  latency: { transport: "img" },
  builtIn: true,
}));
