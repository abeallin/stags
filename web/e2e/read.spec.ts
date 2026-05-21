import { test, expect } from "@playwright/test";

// Non-destructive checks. Safe to run against local OR deployed.

test.describe("Landing page", () => {
  test("shows links to both stag pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Stags" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Barcelona/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Stockholm/i })).toBeVisible();
  });
});

test.describe("BCN stag page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bcn");
  });

  test("renders header, T-minus badge, and 5 day tabs", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Barcelona/i })).toBeVisible();
    await expect(page.locator(".trip-badge")).toContainText(/T-?minus|Trip complete|Today/);
    const tabs = page.locator(".day-tabs .tab");
    await expect(tabs).toHaveCount(5);
    // 3-7 June 2026 → Wed Thu Fri Sat Sun
    await expect(tabs.nth(0)).toContainText("Wed");
    await expect(tabs.nth(0)).toContainText("3");
    await expect(tabs.nth(4)).toContainText("Sun");
  });

  test("day tab click changes the active day", async ({ page }) => {
    const tabs = page.locator(".day-tabs .tab");
    const beforeActive = page.locator(".day-section.active").first();
    const beforeDate = await beforeActive.locator(".day-date").innerText();

    await tabs.nth(2).click(); // Friday
    await expect(page.locator(".day-section.active .day-date")).not.toHaveText(beforeDate);
    await expect(page.locator(".day-section.active .day-date")).toContainText("Friday");
  });

  test("slot title and website pill link out safely when URLs are set", async ({ page }) => {
    // Vivo Tapas (day 1) has both a map and a website URL backfilled.
    // The .slot-thumb thumbnail is rendered conditionally on microlink
    // returning an image, so we don't assert on it. The title-link and
    // website-pill are unconditional when their URL fields are set.
    await page.locator(".day-tabs .tab", { hasText: "Wed" }).click();
    const vivo = page.locator(".slot", { hasText: "Vivo Tapas" });

    const titleLink = vivo.locator("a.slot-title-link");
    await expect(titleLink).toHaveAttribute("href", /maps\.google\.com/);
    await expect(titleLink).toHaveAttribute("target", "_blank");
    await expect(titleLink).toHaveAttribute("rel", /noopener/);

    const sitePill = vivo.locator("a.slot-website-pill");
    await expect(sitePill).toHaveAttribute("href", /vivotapas\.com/);
    await expect(sitePill).toHaveAttribute("target", "_blank");
    await expect(sitePill).toHaveAttribute("rel", /noopener/);
  });
});

test.describe("STHLM stag page", () => {
  test("renders 4 day tabs and unicode-correct slot titles", async ({ page }) => {
    await page.goto("/sthlm");
    await expect(page.getByRole("heading", { name: /Stockholm/i })).toBeVisible();
    await expect(page.locator(".day-tabs .tab")).toHaveCount(4);
    // Unicode integrity — title contains ä
    await expect(page.locator(".slot-title", { hasText: "Lilla Gästabud" })).toBeVisible();
  });
});
