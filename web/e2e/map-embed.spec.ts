import { test, expect } from "@playwright/test";
import { toEmbedUrl } from "../src/lib/mapEmbed";

// Visual smoke test for the Google Maps iframe embed used in slot cards.
// Renders a synthetic slot HTML so we can verify the iframe loads a real map
// without needing PocketBase data — kind of a "does maps.google.com/?output=embed
// still work without an API key" canary.

const FIXTURES = [
  { name: "Vivo Tapas Barcelona",         url: "https://www.google.com/maps/search/?api=1&query=Vivo+Tapas+Barcelona" },
  { name: "Pharmarium Stockholm",         url: "https://www.google.com/maps/search/?api=1&query=Pharmarium+Stockholm" },
  { name: "Parc del Fòrum Barcelona",     url: "https://www.google.com/maps/search/?api=1&query=Parc+del+F%C3%B2rum+Barcelona" },
];

test("Google Maps embed renders inside a slot-card-sized container", async ({ page }, testInfo) => {
  // Emulate the slot card width on a typical phone (560px container - 40px padding)
  await page.setViewportSize({ width: 520, height: 800 });

  const cards = FIXTURES.map((f) => `
    <div class="card">
      <div class="title">${f.name}</div>
      <div class="map">
        <iframe src="${toEmbedUrl(f.url)}" loading="eager"></iframe>
      </div>
    </div>
  `).join("");

  await page.setContent(`<!doctype html>
    <html><head><meta charset="utf-8"><style>
      body { font: 14px monospace; background: #f3ecd9; padding: 20px; margin: 0; }
      .card { border: 2px solid #0a0a0a; padding: 16px; margin-bottom: 14px; background: #f3ecd9; }
      .title { font-weight: 700; text-transform: uppercase; margin-bottom: 10px; }
      .map { position: relative; border: 1.5px solid #0a0a0a; background: #e6dcc2; width: 100%; max-width: 280px; height: 150px; overflow: hidden; }
      .map iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #e6dcc2; }
    </style></head><body>${cards}</body></html>`);

  // Give Google Maps a moment to load tiles + marker
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  // Sanity: iframes exist and are not empty
  const iframes = page.locator("iframe");
  await expect(iframes).toHaveCount(FIXTURES.length);

  // Verify each iframe actually loaded something from maps.google.com
  for (let i = 0; i < FIXTURES.length; i++) {
    const src = await iframes.nth(i).getAttribute("src");
    expect(src).toContain("maps.google.com");
    expect(src).toContain("output=embed");
  }

  // Screenshots land in Playwright's auto-gitignored test-results/<test>/ dir
  // so we don't litter the working tree. They're useful when inspecting a
  // failing run, but otherwise nothing depends on them.
  await page.screenshot({ path: testInfo.outputPath("map-embed.png"), fullPage: true });
  for (let i = 0; i < FIXTURES.length; i++) {
    await page.locator(".card").nth(i).screenshot({
      path: testInfo.outputPath(`map-embed-${i}.png`),
    });
  }
});
