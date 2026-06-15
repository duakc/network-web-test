/** Site category tags, their display order, and color treatments. */

export type SiteTag =
  | "Speedtest"
  | "CDN"
  | "AI"
  | "Cloud"
  | "Dev"
  | "Search"
  | "Email"
  | "Media"
  | "Social"
  | "Shop"
  | "Bank"
  | "Game"
  | "Telegram"
  // Vendor tags (secondary): used for filtering, rarely the primary group.
  | "Microsoft"
  | "Google"
  | "Apple"
  | "CN"
  | "Custom";

/**
 * Sort priority — lower index sorts first within the same speed-capability.
 * Grouping uses a target's FIRST tag (its function); vendor tags sit near the
 * end so they're a secondary filter, not the grouping key.
 */
export const TAG_ORDER: SiteTag[] = [
  "Speedtest",
  "CDN",
  "AI",
  "Cloud",
  "Dev",
  "Search",
  "Email",
  "Media",
  "Social",
  "Shop",
  "Bank",
  "Game",
  "Telegram",
  "Microsoft",
  "Google",
  "Apple",
  "CN",
  "Custom",
];

/** Tags users may assign (Custom is applied automatically, not chosen). */
export const SELECTABLE_TAGS: SiteTag[] = TAG_ORDER.filter((t) => t !== "Custom");

/** Rank of a target's tags for sorting (smallest wins). */
export function tagRank(tags: SiteTag[]): number {
  if (!tags.length) return TAG_ORDER.length;
  return Math.min(...tags.map((t) => TAG_ORDER.indexOf(t)));
}