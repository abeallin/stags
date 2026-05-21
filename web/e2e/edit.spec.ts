import { test, expect, type Page } from "@playwright/test";
import { setDisplayName, uniqueTitle, slotCardByTitle } from "./helpers";

// Mutating tests. Each test creates uniquely-named entities; the afterEach
// hook also sweeps anything with a "PW-" prefix or the literal "New slot"
// default in case a test bailed before cleaning up.

const PB_URL = "http://127.0.0.1:8090";

async function purgeTestSlots() {
  // Delete leftover slots from previous runs (any "PW-" prefix or default "New slot")
  const filter = encodeURIComponent('title~"PW-" || title="New slot"');
  const res = await fetch(`${PB_URL}/api/collections/slots/records?perPage=200&filter=${filter}`);
  const data = await res.json() as { items: { id: string }[] };
  for (const s of data.items) {
    await fetch(`${PB_URL}/api/collections/slots/records/${s.id}`, { method: "DELETE" });
  }
}

async function purgeTestDays() {
  const filter = encodeURIComponent('title~"PW-" || title="New day"');
  const res = await fetch(`${PB_URL}/api/collections/days/records?perPage=200&filter=${filter}`);
  const data = await res.json() as { items: { id: string }[] };
  for (const d of data.items) {
    await fetch(`${PB_URL}/api/collections/days/records/${d.id}`, { method: "DELETE" });
  }
}

test.beforeAll(({}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? "";
  if (!baseURL.includes("127.0.0.1") && !baseURL.includes("localhost")) {
    throw new Error(`edit.spec.ts is local-only; got BASE_URL=${baseURL}`);
  }
});

test.afterEach(async () => {
  await purgeTestSlots();
  await purgeTestDays();
});

async function enterEditMode(page: Page, slug = "/bcn") {
  await setDisplayName(page, "PW-Bot");
  await page.goto(slug);
  await expect(page.locator(".slot").first()).toBeVisible();
  await page.locator(".edit-toggle").click();
  await expect(page.locator(".edit-toggle")).toHaveText(/Done/);
}

/** Click "+ add slot" and immediately rename the newly-added card to a unique title. */
async function addSlotWithTitle(page: Page, title: string) {
  const activeDay = page.locator(".day-section.active");
  const before = await activeDay.locator(".slot").count();
  await activeDay.locator(".add-slot").click();
  await expect(activeDay.locator(".slot")).toHaveCount(before + 1, { timeout: 8_000 });
  const newest = activeDay.locator(".slot").last();
  await newest.locator(".slot-edit-icons button").filter({ hasText: /^Edit$/ }).click();
  await expect(page.locator(".modal")).toBeVisible();
  await page.locator(".modal input#slot-title").fill(title);
  await page.locator(".modal-foot button.primary").click();
  await expect(page.locator(".modal")).toBeHidden();
  await expect(slotCardByTitle(page, title)).toBeVisible({ timeout: 8_000 });
}

test.describe("Edit mode toggle", () => {
  test("clicking Edit enters editing state and reveals slot icons", async ({ page }) => {
    await setDisplayName(page, "Tester");
    await page.goto("/bcn");
    await expect(page.locator(".slot").first()).toBeVisible();
    await page.locator(".edit-toggle").click();
    await expect(page.locator(".edit-toggle")).toHaveText(/Done/);
    await expect(page.locator(".slot-edit-icons").first()).toBeVisible();
    await page.locator(".edit-toggle").click();
    await expect(page.locator(".edit-toggle")).toHaveText(/Edit/);
  });
});

test.describe("Slot CRUD", () => {
  test("add → edit → delete a slot", async ({ page }) => {
    const initialTitle = uniqueTitle("PW-Add");
    const editedTitle  = `${initialTitle}-edited`;
    await enterEditMode(page);
    await addSlotWithTitle(page, initialTitle);

    // EDIT — rename
    const mySlot = slotCardByTitle(page, initialTitle);
    await mySlot.locator(".slot-edit-icons button").filter({ hasText: /^Edit$/ }).click();
    await page.locator(".modal input#slot-title").fill(editedTitle);
    await page.locator(".modal-foot button.primary").click();
    await expect(slotCardByTitle(page, editedTitle)).toBeVisible({ timeout: 8_000 });

    // DELETE — custom confirm dialog
    await slotCardByTitle(page, editedTitle)
      .locator(".slot-edit-icons button").filter({ hasText: /^Delete$/ }).click();
    await expect(page.locator(".confirm-dialog")).toBeVisible();
    await page.locator(".confirm-dialog .modal-foot button.primary").click();
    await expect(slotCardByTitle(page, editedTitle)).toHaveCount(0, { timeout: 8_000 });
  });

  test("move slot up: newly-added slot becomes not-last after one ↑ click", async ({ page }) => {
    const title = uniqueTitle("PW-Reorder");
    await enterEditMode(page);

    const activeDay = page.locator(".day-section.active");
    const before = await activeDay.locator(".slot").count();
    await addSlotWithTitle(page, title);
    await expect(activeDay.locator(".slot")).toHaveCount(before + 1);

    // It should currently be the LAST slot
    await expect(activeDay.locator(".slot").last()).toContainText(title);

    // Move up
    await slotCardByTitle(page, title)
      .locator(".slot-edit-icons button").filter({ hasText: "↑" }).click();
    await page.waitForTimeout(800);

    // Now it should NOT be the last
    await expect(activeDay.locator(".slot").last()).not.toContainText(title);
  });
});

test.describe("Day CRUD", () => {
  test("add day → new tab appears → delete day", async ({ page }) => {
    await enterEditMode(page);
    const tabsBefore = await page.locator(".day-tabs .tab").count();

    // The + tab is the last one. Clicking it adds "New day" as a new section.
    await page.locator(".day-tabs button.tab", { hasText: /^\+$/ }).click();
    await expect(page.locator(".day-tabs .tab")).toHaveCount(tabsBefore + 1, { timeout: 8_000 });
    const newDaySection = page.locator(".day-section").filter({ has: page.locator(".day-title", { hasText: "New day" }) });
    await expect(newDaySection).toHaveCount(1, { timeout: 8_000 });

    // Switch to the new day so its Delete button is visible (.day-section.active only)
    const newDayId = await newDaySection.getAttribute("data-day-id");
    expect(newDayId).toBeTruthy();
    // The new day's tab is now in the list; click it via the wrapper attribute trick
    // (simpler: count down from end — new day's tab is just before the + tab)
    const lastDateTab = page.locator(".day-tabs .tab").nth(tabsBefore - 1); // tabsBefore was pre-add, now this is the new tab
    await lastDateTab.click();
    await expect(newDaySection).toHaveClass(/active/);

    // Now Delete day is visible — click it, confirm via the custom dialog
    await newDaySection.locator(".delete-day-btn").click();
    await expect(page.locator(".confirm-dialog")).toBeVisible();
    await page.locator(".confirm-dialog .modal-foot button.primary").click();
    await expect(page.locator(".day-section").filter({ has: page.locator(".day-title", { hasText: "New day" }) })).toHaveCount(0, { timeout: 8_000 });
    await expect(page.locator(".day-tabs .tab")).toHaveCount(tabsBefore);
  });
});

test.describe("Undo last edit", () => {
  test("undo a slot rename restores the original title", async ({ page }) => {
    const tempTitle = `Vivo Tapas TEMP ${Date.now()}`;
    await enterEditMode(page);
    await page.locator(".day-tabs .tab", { hasText: "Wed" }).click();

    const original = slotCardByTitle(page, "Vivo Tapas");
    await expect(original).toBeVisible();
    await original.locator(".slot-edit-icons button").filter({ hasText: /^Edit$/ }).click();
    await page.locator(".modal input#slot-title").fill(tempTitle);
    await page.locator(".modal-foot button.primary").click();
    await expect(slotCardByTitle(page, tempTitle)).toBeVisible({ timeout: 8_000 });

    await page.locator(".undo-bar button", { hasText: /Undo/i }).click();
    await expect(slotCardByTitle(page, "Vivo Tapas")).toBeVisible({ timeout: 8_000 });
    await expect(slotCardByTitle(page, tempTitle)).toHaveCount(0);
  });
});
