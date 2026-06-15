// Detects which CDN / network each built-in target sits behind, OFFLINE.
//
// Pipeline (no local `dig` needed — pure web APIs, runs anywhere):
//   1. Google DoH (https://dns.google/resolve) resolves the host to an A record
//      IP (following the CNAME chain the resolver returns).
//   2. ip.sb (https://api.ip.sb/geoip/<ip>) maps that IP to an ASN + org name.
//   3. The ASN is matched against a table of known CDN/cloud ASNs to label the
//      vendor (the org name is the authoritative identity regardless).
//
// The result is a map of `id -> vendor` written to src/config/cdn-detected.ts.
// IMPORTANT: this is used ONLY to pick the right runtime probe function (e.g.
// Cloudflare sites → the `/cdn-cgi/trace` colo resolver) — NOT to display a
// frozen ASN/geo. The actual ASN + PoP is resolved live in the browser, per the
// user's own location (this build runs from one place; users are everywhere).
//
// Run manually (it makes ~1 DoH + 1 ip.sb call per target): `pnpm detect-cdn`.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = path.join(ROOT, "src", "config", "targets.ts");
const OUT = path.join(ROOT, "src", "config", "cdn-detected.ts");

// Browser-like UA — ip.sb 403s the default Node/curl agent.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// Known CDN/cloud ASNs → normalized vendor key. Best-effort; the org name from
// ip.sb is what we display, so this only needs to cover the common providers.
const ASN_CDN = new Map(
  Object.entries({
    13335: "cloudflare",
    54113: "fastly",
    20940: "akamai", 16625: "akamai", 16702: "akamai", 18717: "akamai",
    20189: "akamai", 21342: "akamai", 21357: "akamai", 23454: "akamai",
    23455: "akamai", 32787: "akamai", 35994: "akamai", 39836: "akamai",
    16509: "amazon", 14618: "amazon", // AWS / CloudFront
    15169: "google", 396982: "google", // Google / GCP
    8075: "azure", 8068: "azure", 8069: "azure", // Microsoft
    60068: "cdn77", 136620: "cdn77", // DataCamp / CDN77
    37963: "alibaba", 45102: "alibaba", 134963: "alibaba", 24429: "alibaba",
    132203: "tencent", 45090: "tencent", 137876: "tencent",
    55967: "baidu", 38365: "baidu",
    14061: "digitalocean",
    21859: "zenlayer", 62597: "zenlayer", 6939: "zenlayer",
    396986: "bytedance", 138699: "bytedance",
    19551: "incapsula", // Imperva
    20446: "stackpath",
    22822: "limelight", 23059: "limelight", // Edgio
  }).map(([k, v]) => [Number(k), v]),
);

/** Pull `{ id, host }` for each built-in target out of targets.ts source. */
async function readTargets() {
  const src = await readFile(TARGETS, "utf8");
  // Match `id: "x", ... latencyUrl: "https://host/..."` blocks (id precedes url).
  const out = [];
  const re = /id:\s*[`"']([^`"']+)[`"'][\s\S]*?latencyUrl:\s*[`"']([^`"']+)[`"']/g;
  let m;
  while ((m = re.exec(src))) {
    try {
      out.push({ id: m[1], host: new URL(m[2]).host });
    } catch {
      /* skip unparseable URL (e.g. a template literal) */
    }
  }
  // De-dupe by id (the regex can re-match across a long block).
  const seen = new Set();
  return out.filter((t) => (seen.has(t.id) ? false : seen.add(t.id)));
}

async function resolveIp(host) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) return null;
  const json = await res.json();
  const a = (json.Answer ?? []).find((r) => r.type === 1); // type 1 = A
  return a?.data ?? null;
}

async function lookupAsn(ip) {
  const res = await fetch(`https://api.ip.sb/geoip/${ip}`, {
    headers: { "user-agent": UA, accept: "application/json" },
  });
  if (!res.ok) return null;
  const j = await res.json();
  if (!j.asn) return null;
  return { asn: j.asn, asnName: j.asn_organization ?? j.organization ?? "" };
}

async function detect(host) {
  const ip = await resolveIp(host);
  if (!ip) return null;
  const asn = await lookupAsn(ip);
  if (!asn) return null;
  return { asn: asn.asn, asnName: asn.asnName, cdn: ASN_CDN.get(asn.asn) ?? null };
}

async function main() {
  const targets = await readTargets();
  console.log(`Probing ${targets.length} targets via Google DoH + ip.sb…`);
  const detected = {};
  for (const { id, host } of targets) {
    try {
      const d = await detect(host);
      if (d) {
        detected[id] = d;
        console.log(`  ${id.padEnd(16)} ${host.padEnd(34)} AS${d.asn} ${d.asnName}${d.cdn ? ` [${d.cdn}]` : ""}`);
      } else {
        console.log(`  ${id.padEnd(16)} ${host.padEnd(34)} (no ASN)`);
      }
    } catch (e) {
      console.log(`  ${id.padEnd(16)} ${host.padEnd(34)} ERROR ${e.message}`);
    }
  }

  // Emit only recognized CDN/cloud vendors — `id -> vendor`. Used purely to pick
  // the runtime probe function; ASN/geo is resolved live, not frozen here.
  const withVendor = Object.keys(detected)
    .filter((id) => detected[id].cdn)
    .sort();
  const body = withVendor
    .map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(detected[id].cdn)},`)
    .join("\n");

  const ts =
    `// AUTO-GENERATED by scripts/detect-cdn.mjs — do not edit by hand.\n` +
    `// Maps a target id to its detected CDN vendor (Google DoH → ip.sb → ASN).\n` +
    `// Used ONLY to choose the runtime PoP probe function — NOT to display a\n` +
    `// frozen ASN/geo (that is resolved live, per the user's location).\n` +
    `// Regenerate with \`pnpm detect-cdn\`.\n` +
    `export const CDN_DETECTED: Record<string, string> = {\n${body}\n};\n`;
  await writeFile(OUT, ts);
  console.log(`\nWrote ${withVendor.length} vendor entries to src/config/cdn-detected.ts`);
}

main();