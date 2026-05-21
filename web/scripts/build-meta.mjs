/**
 * Post-build: emit dist/<slug>/index.html with overridden OG + Twitter meta
 * tags so link unfurls in WhatsApp/Slack/iMessage show the right card per
 * route. The OG PNG art itself is committed under public/og-*.png — Vite
 * copies it to dist at build time. Regenerate the PNGs with
 * `npm run build:og` when the design changes.
 *
 * Pure Node — no Playwright, no extra deps — so this is safe to run in CI.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");
const SITE = "https://abeallin.github.io/stags";

const stags = [
  {
    slug:  "bcn",
    title: "Barcelona Stag · 3–7 June 2026",
    desc:  "Five lads building to eight. Primavera Sound. The plan.",
  },
  {
    slug:  "sthlm",
    title: "Stockholm Stag · 11–14 June 2026",
    desc:  "Sauna, archipelago, Punk Royale. The plan.",
  },
];

function metaBlock(s) {
  return `<meta property="og:type" content="website">
    <meta property="og:title" content="${s.title}">
    <meta property="og:description" content="${s.desc}">
    <meta property="og:image" content="${SITE}/og-${s.slug}.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${SITE}/${s.slug}/">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${s.title}">
    <meta name="twitter:description" content="${s.desc}">
    <meta name="twitter:image" content="${SITE}/og-${s.slug}.png">
    <title>${s.title}</title>`;
}

const base = await readFile(join(DIST, "index.html"), "utf8");
for (const stag of stags) {
  const out = join(DIST, stag.slug);
  await mkdir(out, { recursive: true });
  const html = base.replace(/<title>[^<]*<\/title>/, metaBlock(stag));
  await writeFile(join(out, "index.html"), html, "utf8");
  console.log(`  ✓ ${join(out, "index.html")}`);
}
