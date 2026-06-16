import { CDN_DETECTED } from "@/config/cdn-detected";
import { ICON_OVERRIDES } from "@/config/icon-overrides";
import { cloudflarePop } from "@/config/cdn-probes";
import { RAW_PRESETS } from "@/config/targets/index";
import type { NetworkTarget, TestSettings } from "@/types";

/**
 * Built-in targets are declared per category under `config/targets/` (one
 * `*.config.ts` per group, aggregated into `RAW_PRESETS`). This file is the join
 * layer: it finalizes each raw target (icon path, offline CDN vendor, live-PoP
 * resolver, group) and exports the runtime list + default settings.
 *
 * Every probe detail lives ON the target: `latencyUrl` is the exact URL hit, and
 * `latency` carries method/mode/status overrides (default = HEAD + no-cors). There
 * is NO build-time endpoint rewriting — what you read is what gets probed.
 */

/**
 * Targets that reuse another target's icon instead of fetching their own
 * (e.g. the Akamai media CDN shares the Akamai logo).
 */
const ICON_ALIAS: Record<string, string> = {
  // AWS (the cloud) + every AWS-region observation point share the CloudFront
  // icon (the `aws-*` regions are mapped by prefix in the finalization step).
  "aws": "cloudfront",
  "akamai-media": "akamai",
  "akamai-eip": "akamai",
  // OVH CDN reuses the (sharp) OVHcloud icon rather than fetching its own.
  "ovh-cdn": "ovh",
  // Cloudflare plan tiers all share the Cloudflare logo.
  "cf-free": "cloudflare",
  "cf-pro": "cloudflare",
  "cf-business": "cloudflare",
  "cf-enterprise": "cloudflare",
  "cf-spectrum": "cloudflare",
  "cf-pages": "cloudflare",
  // GCP/Azure CDN reuse the existing Google Cloud / Azure icons.
  "gcp-cdn": "gcp",
  "azure-cdn": "azure",
};

/**
 * Templated region families (e.g. `aws-ap-east-1`, `linode-tokyo2`, `vultr-sgp`)
 * expose no per-member icon — each family shares one. Matched by id prefix in the
 * finalization step; add a vendor here when introducing a new region family.
 */
const REGION_ICON: Record<string, string> = {
  "aws-": "cloudfront",
  "linode-": "linode",
  "vultr-": "vultr",
  "aliyun-": "aliyun",
  "tencent-": "tencentcloud",
  "huawei-": "huaweicloud",
  "baidu-": "baidu",
  "gcp-": "gcp",
  "azure-": "azure",
};

/**
 * Finalize each built-in. This is a pure data join — it does NOT touch the probe
 * endpoints (those are declared on the target above). It only:
 *   - resolves the locally pre-fetched icon path;
 *   - attaches the offline-detected CDN *vendor* (Google DoH → ip.sb ASN), a
 *     location-independent label safe to show even when no live PoP header is
 *     CORS-readable. China sites are exempt — their domestic multi-CDN routing
 *     makes a single ASN unreliable (e.g. bilibili → an overseas Zenlayer node) —
 *     unless the target itself is a dedicated CDN test (CDN tag or its own probe);
 *   - for Cloudflare-fronted sites that probe `/cdn-cgi/trace`, attaches the live
 *     PoP resolver that reads the colo from that same response. A Cloudflare site
 *     pinned off trace (e.g. Discord, whose WAF 403s trace cross-origin) gets no
 *     live probe and just shows the vendor label.
 * Custom targets carry no `cdnVendor` and resolve their CDN live, per user.
 */
export const PRESET_TARGETS: NetworkTarget[] = RAW_PRESETS.map((t) => {
  // Region families share one icon, matched by id prefix (see REGION_ICON);
  // everything else uses its alias, then its own id.
  const familyIcon = Object.entries(REGION_ICON).find(([prefix]) =>
    t.id.startsWith(prefix),
  )?.[1];
  const iconId = familyIcon ?? ICON_ALIAS[t.id] ?? t.id;
  const icon = `/icons/${ICON_OVERRIDES[iconId] ?? `${iconId}.png`}`;

  const isCdnTarget = !!t.cdn || t.tags.includes("CDN");
  const vendor =
    t.tags.includes("CN") && !isCdnTarget ? undefined : CDN_DETECTED[t.id];
  const cloudflare = t.cloudflare ?? vendor === "cloudflare";

  const cdn =
    t.cdn ??
    (cloudflare && /\/cdn-cgi\/trace$/.test(t.latencyUrl)
      ? { popBody: true, popInfo: cloudflarePop }
      : undefined);

  // Group defaults to the first tag, but is its own field so it can be set
  // independently of the (filterable) tag list.
  return { ...t, icon, group: t.group ?? t.tags[0], cdn, cdnVendor: vendor, cloudflare };
});

/**
 * Render order IS the file order: targets appear in the order they are declared
 * in `RAW_PRESETS` (custom targets after the built-ins). Ranking — e.g. CDNs by
 * popularity, Cloudflare first — is done by ordering the array above, not by a
 * sort key. The grouped view still buckets by `TAG_ORDER`, preserving this order
 * within each group.
 */
export function sortTargets(targets: NetworkTarget[]): NetworkTarget[] {
  return targets;
}

export const THREAD_OPTIONS = [1, 2, 4, 8, 16] as const;

export const DEFAULT_SETTINGS: TestSettings = {
  latencyCount: 16,
  speedThreads: 4,
  speedLimitMode: "time",
  speedDurationMs: 30_000,
  speedStopMB: 500,
  speedRamp: false,
  monitorIntervalMs: 3_000,
  speedDirection: "down",
};