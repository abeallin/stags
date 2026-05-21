/**
 * Generates the per-stag OG card PNGs (1200x630) into web/public/og-*.png.
 * Run manually with `npm run build:og` whenever the design changes — the
 * output gets committed and shipped via Vite's public/ copy at build time.
 *
 * Uses Playwright/Chromium (already a devDep for e2e tests) so we have a
 * real browser to rasterize Bowlby One reliably. Not run in CI.
 */
import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const stags = [
  {
    slug:   "bcn",
    name:   "Barca",
    year:   "2026",
    dates:  "3—7 JUNE",
    accent: "#c84a2c",
    sub:    "THE STAG · EL CIERVO",
  },
  {
    slug:   "sthlm",
    name:   "Sthlm",
    year:   "2026",
    dates:  "11—14 JUNE",
    accent: "#2c5f7c",
    sub:    "THE STAG · HJORTEN",
  },
];

function ogHtml(s) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1200px; height: 630px; }
  body {
    background: #f3ecd9;
    color: #0a0a0a;
    font-family: 'DM Mono', monospace;
    overflow: hidden;
    position: relative;
  }
  body::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(circle at 50% 50%, rgba(10,10,10,0.08) 1.5px, transparent 2px) 0 0 / 22px 22px,
      radial-gradient(circle at 50% 50%, rgba(10,10,10,0.05) 1px, transparent 1.5px) 11px 11px / 22px 22px;
    pointer-events: none;
  }
  .card {
    position: absolute;
    inset: 30px;
    background: #f3ecd9;
    border: 5px solid #0a0a0a;
    box-shadow: 16px 16px 0 ${s.accent};
    padding: 50px 60px 56px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute;
    top: 60px; left: 0; right: 0;
    height: 6px;
    background:
      radial-gradient(circle at 50% 50%, #f3ecd9 2.5px, transparent 3px) 0 0 / 18px 6px repeat-x,
      #0a0a0a;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
  }
  .eyebrow {
    font-size: 22px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: ${s.accent};
    font-weight: 500;
  }
  .corner {
    font-family: 'Bowlby One', sans-serif;
    font-size: 28px;
    color: #0a0a0a;
  }
  h1 {
    font-family: 'Bowlby One', sans-serif;
    font-weight: 400;
    font-size: 156px;
    line-height: 0.86;
    text-transform: uppercase;
    letter-spacing: -0.04em;
    margin-top: 56px;
  }
  h1 em {
    font-style: normal;
    color: ${s.accent};
    margin-left: 8px;
  }
  .year {
    font-family: 'Bowlby One', sans-serif;
    font-size: 104px;
    line-height: 0.86;
    letter-spacing: -0.04em;
    color: #0a0a0a;
    margin-top: 14px;
  }
  .chips {
    display: flex;
    gap: 12px;
    margin-top: auto;
  }
  .chip {
    font-size: 19px;
    letter-spacing: 3.5px;
    text-transform: uppercase;
    padding: 11px 18px 10px;
    border: 2.5px solid #0a0a0a;
    font-weight: 500;
    background: #f3ecd9;
    color: #0a0a0a;
  }
  .chip.dark {
    background: #0a0a0a;
    color: #f3ecd9;
  }
  .chip.accent {
    background: ${s.accent};
    color: #f3ecd9;
    border-color: ${s.accent};
  }
</style></head>
<body>
  <div class="card">
    <div class="head">
      <div class="eyebrow">// STAG · ${s.year}</div>
      <div class="corner">·</div>
    </div>
    <h1>${s.name}<em>·</em></h1>
    <div class="year">${s.year}</div>
    <div class="chips">
      <div class="chip dark">${s.dates}</div>
      <div class="chip accent">${s.sub}</div>
    </div>
  </div>
</body></html>`;
}

const browser = await chromium.launch();
try {
  for (const stag of stags) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(ogHtml(stag), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const out = join(PUBLIC, `og-${stag.slug}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    await page.close();
    console.log(`  ✓ ${out}`);
  }
} finally {
  await browser.close();
}
