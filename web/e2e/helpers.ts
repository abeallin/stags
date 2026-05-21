import type { Page } from "@playwright/test";

export const STAG_SLUGS = ["bcn", "sthlm"] as const;
export type StagSlug = typeof STAG_SLUGS[number];

/**
 * Prime localStorage so the app skips the displayName prompt that fires on
 * first Edit toggle. Must be called BEFORE the first navigation.
 */
export async function setDisplayName(page: Page, name: string) {
  await page.addInitScript((displayName) => {
    localStorage.setItem("stags.displayName", displayName);
  }, name);
}

/**
 * Generate a name guaranteed not to collide with seeded data so write tests
 * can safely create + delete entities without polluting the real schedule.
 */
export function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

/**
 * Wait for a slot card with the given title to appear, returning its container.
 * Subscriptions are async so we can't assume immediate visibility after a save.
 */
export function slotCardByTitle(page: Page, title: string) {
  return page.locator(".slot", { hasText: title });
}
