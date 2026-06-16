// Built-in targets, one file per category (group) so the on-screen grouping maps
// directly to the source. The grouped view buckets by a target's `group` field
// (see PRESET_TARGETS in ../targets.ts), so order within a group = order here, and
// the groups themselves are ordered by TAG_ORDER. The spread order below follows
// TAG_ORDER for a sensible flat-view order too.
import type { NetworkTarget } from "@/types";

import { CDN_TARGETS } from "./cdn.config";
import { AWS_TARGETS } from "./aws.config";
import { LINODE_TARGETS } from "./linode.config";
import { VULTR_TARGETS } from "./vultr.config";
import { ALIYUN_TARGETS } from "./aliyun.config";
import { TENCENT_TARGETS } from "./tencent.config";
import { HUAWEI_TARGETS } from "./huawei.config";
import { BAIDU_TARGETS } from "./baidu.config";
import { GCP_TARGETS } from "./gcp.config";
import { AI_TARGETS } from "./ai.config";
import { CLOUD_TARGETS } from "./cloud.config";
import { DEV_TARGETS } from "./dev.config";
import { SEARCH_TARGETS } from "./search.config";
import { MEDIA_TARGETS } from "./media.config";
import { SOCIAL_TARGETS } from "./social.config";
import { SHOP_TARGETS } from "./shop.config";
import { BANK_TARGETS } from "./bank.config";
import { GAME_TARGETS } from "./game.config";
import { APPLE_TARGETS } from "./apple.config";
import { TELEGRAM_TARGETS } from "./telegram.config";

/** Every built-in target, before icon/CDN finalization (see ../targets.ts). */
export const RAW_PRESETS: NetworkTarget[] = [
  ...CDN_TARGETS,
  ...AWS_TARGETS,
  ...LINODE_TARGETS,
  ...VULTR_TARGETS,
  ...ALIYUN_TARGETS,
  ...TENCENT_TARGETS,
  ...HUAWEI_TARGETS,
  ...BAIDU_TARGETS,
  ...GCP_TARGETS,
  ...AI_TARGETS,
  ...CLOUD_TARGETS,
  ...DEV_TARGETS,
  ...SEARCH_TARGETS,
  ...MEDIA_TARGETS,
  ...SOCIAL_TARGETS,
  ...SHOP_TARGETS,
  ...BANK_TARGETS,
  ...GAME_TARGETS,
  ...APPLE_TARGETS,
  ...TELEGRAM_TARGETS,
];
