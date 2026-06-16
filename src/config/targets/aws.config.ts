import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

/**
 * AWS regions (data centres) — latency to each region's EC2 service endpoint.
 * Every region (incl. the two China regions, on the `.com.cn` suffix) exposes a
 * tiny `ec2.<region>.amazonaws.com[.cn]/ping` health check (HTTP 200 on HEAD, no
 * CORS), so the default HEAD/no-cors probe times the round trip. NB: the China
 * `dynamodb.*` host 404s on HEAD — only `ec2.*` answers it. Ordered by great-circle
 * distance from northern China (Beijing) — nearer first. Icon resolves via
 * REGION_ICON (→ CloudFront) in targets.ts.
 */
export const AWS_TARGETS: NetworkTarget[] = (
  [
    ["cn-north-1", "北京"],
    ["cn-northwest-1", "宁夏"],
    ["ap-northeast-2", "首尔"],
    ["ap-northeast-3", "大阪"],
    ["ap-east-1", "香港"],
    ["ap-northeast-1", "东京"],
    ["ap-southeast-1", "新加坡"],
    ["ap-south-2", "海得拉巴"],
    ["ap-south-1", "孟买"],
    ["ap-southeast-3", "雅加达"],
    ["me-central-1", "阿联酋"],
    ["me-south-1", "巴林"],
    ["eu-north-1", "斯德哥尔摩"],
    ["eu-central-1", "法兰克福"],
    ["eu-central-2", "苏黎世"],
    ["eu-south-1", "米兰"],
    ["eu-west-2", "伦敦"],
    ["eu-west-3", "巴黎"],
    ["eu-west-1", "爱尔兰"],
    ["us-west-2", "俄勒冈"],
    ["ap-southeast-2", "悉尼"],
    ["ap-southeast-4", "墨尔本"],
    ["eu-south-2", "西班牙"],
    ["us-west-1", "北加州"],
    ["ca-central-1", "加拿大中部"],
    ["us-east-2", "俄亥俄"],
    ["us-east-1", "弗吉尼亚"],
    ["af-south-1", "开普敦"],
    ["sa-east-1", "圣保罗"],
  ] as const
).map<NetworkTarget>(([region, city]) => {
  const host = `ec2.${region}.amazonaws.com${region.startsWith("cn-") ? ".cn" : ""}`;
  return {
    id: `aws-${region}`,
    name: `AWS ${region} · ${city}`,
    icon: iconFor("aws.amazon.com"),
    latencyUrl: `https://${host}/ping`,
    tags: ["AWS"],
    builtIn: true,
  };
});
