// Pre-downloads built-in site icons into public/icons/<id>.png so the client
// doesn't fetch them from a third party on every load and a reverse proxy can
// cache them under one path (/icons/).
//
//   pnpm fetch-icons            # download only the icons that are missing
//   pnpm fetch-icons --force    # re-download everything
//
// MANUAL OVERRIDE: every icon is just a file at public/icons/<id>.png. If an
// auto-fetched icon is wrong/blurry/opaque, drop your own PNG there — a normal
// run skips files that already exist, so it won't be overwritten.
//
// Source order per icon: an explicit OVERRIDES URL, then DuckDuckGo's icon
// service (the site's real favicon — usually transparent and sharper than
// Google S2's white-background composite), then Google S2 as a last resort.
import { mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "icons");
const FORCE = process.argv.includes("--force");

// Keep this list in sync with PRESET_TARGETS in src/config/targets.ts.
const ICONS = {
  cloudflare: "cloudflare.com",
  jsdelivr: "jsdelivr.com",
  cachefly: "cachefly.com",
  openai: "openai.com",
  deepseek: "deepseek.com",
  gemini: "gemini.google.com",
  perplexity: "perplexity.ai",
  huggingface: "huggingface.co",
  aws: "aws.amazon.com",
  gcp: "cloud.google.com",
  azure: "azure.microsoft.com",
  digitalocean: "digitalocean.com",
  aliyun: "aliyun.com",
  tencentcloud: "cloud.tencent.com",
  github: "github.com",
  gitlab: "gitlab.com",
  gitee: "gitee.com",
  npm: "npmjs.com",
  google: "google.com",
  bing: "bing.com",
  "cn-bing": "cn.bing.com",
  duckduckgo: "duckduckgo.com",
  youtube: "youtube.com",
  netflix: "netflix.com",
  spotify: "spotify.com",
  twitch: "twitch.tv",
  douyin: "douyin.com",
  x: "x.com",
  reddit: "reddit.com",
  facebook: "facebook.com",
  linkedin: "linkedin.com",
  weibo: "weibo.com",
  epic: "epicgames.com",
  amazon: "amazon.com",
  aliexpress: "aliexpress.com",
  taobao: "taobao.com",
  jd: "jd.com",
  ebay: "ebay.com",
  shopify: "shopify.com",
  wechat: "weixin.qq.com",
  baidu: "baidu.com",
  bilibili: "bilibili.com",
  caiyun: "139.com",
  "steam-cf": "steampowered.com",
  "steam-akamai": "steampowered.com",
  akamai: "akamai.com",
  fastly: "fastly.com",
  unpkg: "unpkg.com",
  office365: "office.com",
  apple: "apple.com",
  discord: "discord.com",
  instagram: "instagram.com",
  whatsapp: "whatsapp.com",
  zhihu: "zhihu.com",
  qq: "qq.com",
  yandex: "yandex.com",
  dropbox: "dropbox.com",
  vercel: "vercel.com",
  netlify: "netlify.com",
  wikipedia: "wikipedia.org",
  edgeone: "edgeone.ai",
  "ovh-cdn": "ovhcloud.com",
  cdn77: "cdn77.com",
  "bunny-standard": "bunny.net",
  "bunny-volume": "bunny.net",
  cloudfront: "aws.amazon.com",
  bytedance: "bytedance.com",
  alicdn: "alibabacloud.com",
  zenlayer: "zenlayer.com",
  cdnetworks: "cdnetworks.com",
  visa: "visa.com",
  notion: "notion.so",
  figma: "figma.com",
  slack: "slack.com",
  canva: "canva.com",
  trello: "trello.com",
};

// Explicit, known-good icon URLs for cases the automatic sources get wrong.
// Add entries here (or just drop a PNG in public/icons/<id>.png) when an
// auto-fetched icon is wrong/blurry/opaque.
const OVERRIDES = {
  // example: bing: "https://raw.githubusercontent.com/.../bing.png",
};

function candidates(id, domain) {
  if (OVERRIDES[id]) return [OVERRIDES[id]];
  const enc = encodeURIComponent(domain);
  // Source priority: explicit override (above) → Google S2 → DuckDuckGo.
  return [
    `https://www.google.com/s2/favicons?domain=${enc}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function tryFetch(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 100) return null; // skip empty / 1x1 stubs
    return buf;
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const cache = new Map(); // url -> Buffer

  for (const [id, domain] of Object.entries(ICONS)) {
    const dest = path.join(OUT, `${id}.png`);
    if (!FORCE && (await exists(dest))) {
      skipped++;
      continue;
    }
    let saved = false;
    for (const url of candidates(id, domain)) {
      let buf = cache.get(url);
      if (!buf) {
        buf = await tryFetch(url);
        if (buf) cache.set(url, buf);
      }
      if (buf) {
        await writeFile(dest, buf);
        ok++;
        saved = true;
        const src = url.includes("duckduckgo") ? "ddg" : url.includes("s2") ? "s2" : "override";
        console.log(`✓ ${id} (${domain}) — ${src}`);
        break;
      }
    }
    if (!saved) {
      failed++;
      console.warn(`✗ ${id} (${domain}) — no source; add public/icons/${id}.png manually`);
    }
  }
  console.log(`\nDone. downloaded=${ok} skipped(existing)=${skipped} failed=${failed}`);
  if (FORCE) console.log("Re-fetched all icons (--force).");
}

main();