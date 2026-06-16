import { iconFor } from "@/lib/network/site";
import type { NetworkTarget } from "@/types";

/**
 * GCP regions via gcping (CloudPing reuses gcping's Cloud Run `/api/ping` nodes,
 * which send CORS `*`). Probed with the default HEAD/no-cors fetch.
 * `maxLatencyCount: 16` (courtesy; see Special Thanks). Icon resolves via
 * REGION_ICON (→ gcp).
 */
export const GCP_TARGETS: NetworkTarget[] = (
  [
    ["asia-east2", "asia-east2-5tkroniexa-df.a.run.app", "香港"],
    ["asia-east1", "asia-east1-5tkroniexa-de.a.run.app", "台湾"],
    ["asia-northeast1", "asia-northeast1-5tkroniexa-an.a.run.app", "东京"],
    ["asia-northeast2", "asia-northeast2-5tkroniexa-dt.a.run.app", "大阪"],
    ["asia-northeast3", "asia-northeast3-5tkroniexa-du.a.run.app", "首尔"],
    ["asia-southeast1", "asia-southeast1-5tkroniexa-as.a.run.app", "新加坡"],
    ["asia-southeast2", "asia-southeast2-5tkroniexa-et.a.run.app", "雅加达"],
    ["asia-south1", "asia-south1-5tkroniexa-el.a.run.app", "孟买"],
    ["asia-south2", "asia-south2-5tkroniexa-em.a.run.app", "德里"],
    ["me-central1", "me-central1-5tkroniexa-ww.a.run.app", "多哈"],
    ["me-central2", "me-central2-5tkroniexa-wx.a.run.app", "达曼"],
    ["me-west1", "me-west1-5tkroniexa-zf.a.run.app", "特拉维夫"],
    ["europe-north1", "europe-north1-5tkroniexa-lz.a.run.app", "芬兰"],
    ["europe-central2", "europe-central2-5tkroniexa-lm.a.run.app", "华沙"],
    ["europe-west3", "europe-west3-5tkroniexa-ey.a.run.app", "法兰克福"],
    ["europe-west4", "europe-west4-5tkroniexa-ez.a.run.app", "荷兰"],
    ["europe-west1", "europe-west1-5tkroniexa-ew.a.run.app", "比利时"],
    ["europe-west2", "europe-west2-5tkroniexa-nw.a.run.app", "伦敦"],
    ["europe-west9", "europe-west9-5tkroniexa-od.a.run.app", "巴黎"],
    ["europe-west8", "europe-west8-5tkroniexa-oc.a.run.app", "米兰"],
    ["europe-west6", "europe-west6-5tkroniexa-oa.a.run.app", "苏黎世"],
    ["europe-west10", "europe-west10-5tkroniexa-oe.a.run.app", "柏林"],
    ["europe-west12", "europe-west12-5tkroniexa-og.a.run.app", "都灵"],
    ["europe-southwest1", "europe-southwest1-5tkroniexa-no.a.run.app", "马德里"],
    ["australia-southeast1", "australia-southeast1-5tkroniexa-ts.a.run.app", "悉尼"],
    ["australia-southeast2", "australia-southeast2-5tkroniexa-km.a.run.app", "墨尔本"],
    ["us-west1", "us-west1-5tkroniexa-uw.a.run.app", "俄勒冈"],
    ["us-west2", "us-west2-5tkroniexa-wl.a.run.app", "洛杉矶"],
    ["us-west3", "us-west3-5tkroniexa-wm.a.run.app", "盐湖城"],
    ["us-west4", "us-west4-5tkroniexa-wn.a.run.app", "拉斯维加斯"],
    ["us-central1", "us-central1-5tkroniexa-uc.a.run.app", "爱荷华"],
    ["us-south1", "us-south1-5tkroniexa-vp.a.run.app", "达拉斯"],
    ["us-east1", "us-east1-5tkroniexa-ue.a.run.app", "南卡"],
    ["us-east4", "us-east4-5tkroniexa-uk.a.run.app", "北弗吉尼亚"],
    ["us-east5", "us-east5-5tkroniexa-ul.a.run.app", "哥伦布"],
    ["northamerica-northeast1", "northamerica-northeast1-5tkroniexa-nn.a.run.app", "蒙特利尔"],
    ["northamerica-northeast2", "northamerica-northeast2-5tkroniexa-pd.a.run.app", "多伦多"],
    ["southamerica-east1", "southamerica-east1-5tkroniexa-rj.a.run.app", "圣保罗"],
    ["southamerica-west1", "southamerica-west1-5tkroniexa-tl.a.run.app", "圣地亚哥"],
    ["africa-south1", "africa-south1-5tkroniexa-bq.a.run.app", "约翰内斯堡"],
    ["global", "global.gcping.com", "全球"],
  ] as const
).map<NetworkTarget>(([region, host, city]) => ({
  id: `gcp-${region}`,
  name: `GCP ${city}`,
  icon: iconFor("cloud.google.com"),
  latencyUrl: `https://${host}/api/ping`,
  tags: ["GCP"],
  maxLatencyCount: 16,
  builtIn: true,
}));
