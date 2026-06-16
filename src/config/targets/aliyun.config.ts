import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

/**
 * 阿里云 OSS regions. Two endpoint sources, by region:
 *  - Where CloudPing (cloud.feitsui.com) hosts a public-benefit bucket, we hit its
 *    tiny `ping.html` (HTTP 200, owner-maintained) — same regions CloudPing lists.
 *  - For the overseas regions CloudPing does NOT cover (feitsui hosts no bucket
 *    there —香港/东京/新加坡/法兰克福/弗吉尼亚), we fall back to Aliyun's OFFICIAL
 *    region endpoint `oss-<region>.aliyuncs.com` (`bucket: null`). Unsigned it
 *    answers 403, but in no-cors that opaque reply still times the round trip — and
 *    it's the official, always-present per-region anchor (no personal bucket / bill).
 *
 * Probed with the default HEAD/no-cors fetch. Mainland-China regions carry the CN
 * tag. `maxLatencyCount: 16` (CloudPing buckets are volunteer-funded — see the
 * Special Thanks note in the links panel). Icon resolves via REGION_ICON.
 */
type AliyunRow = [region: string, bucket: string | null, city: string, cn?: boolean];

export const ALIYUN_TARGETS: NetworkTarget[] = (
  [
    ["cn-beijing", "bjs", "北京", true],
    ["cn-zhangjiakou", "zqz", "张家口", true],
    ["cn-huhehaote", "het", "呼和浩特", true],
    ["cn-wulanchabu", "ucb", "乌兰察布", true],
    ["cn-qingdao", "tao", "青岛", true],
    ["cn-chengdu", "ctu", "成都", true],
    ["cn-hangzhou", "hgh", "杭州", true],
    ["cn-shanghai", "sha", "上海", true],
    ["cn-guangzhou", "can", "广州", true],
    ["cn-shenzhen", "szx", "深圳", true],
    ["cn-heyuan", "heyuan", "河源", true],
    ["ap-northeast-2", "icn", "首尔"],
    ["ap-southeast-3", "kul", "吉隆坡"],
    ["ap-southeast-6", "mnl", "马尼拉"],
    ["ap-southeast-7", "bkk", "曼谷"],
    ["ap-southeast-5", "cgk", "雅加达"],
    ["me-east-1", "dxb", "迪拜"],
    ["eu-west-1", "lhr", "伦敦"],
    ["us-west-1", "silicon-valley", "硅谷"],
    // Official OSS region endpoints — CloudPing hosts no bucket in these regions.
    ["cn-hongkong", null, "香港"],
    ["ap-northeast-1", null, "东京"],
    ["ap-southeast-1", null, "新加坡"],
    ["eu-central-1", null, "法兰克福"],
    ["us-east-1", null, "弗吉尼亚"],
  ] as AliyunRow[]
).map<NetworkTarget>(([region, bucket, city, cn]) => ({
  id: `aliyun-${region}`,
  name: `阿里云 ${city}`,
  icon: iconFor("aliyun.com"),
  latencyUrl: bucket
    ? `https://feitsui-${bucket}.oss-${region}.aliyuncs.com/ping.html`
    : `https://oss-${region}.aliyuncs.com/`,
  tags: cn ? ["Aliyun", "CN"] : ["Aliyun"],
  maxLatencyCount: 16,
  // feitsui buckets answer 200 to an Origin-less <img> (a cross-origin fetch 403s);
  // the official region endpoints (bucket=null) 403 either way, so leave them on fetch.
  ...(bucket ? { latency: { transport: "img" as const } } : {}),
  builtIn: true,
}));