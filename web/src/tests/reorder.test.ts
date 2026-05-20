import { describe, it, expect } from "vitest";
import { computeSwap } from "../lib/reorder";
import type { Slot } from "../lib/types";

const mk = (overrides: Partial<Slot>): Slot => ({
  id: "x", day: "d1",
  start_time: "2026-06-03T12:00", time_label: "12pm", title: "x",
  note: "", tags: [], is_featured: false, sort_order: 0,
  ...overrides,
});

describe("computeSwap", () => {
  it("swaps sort_order with neighbour above when moving up", () => {
    const slots = [
      mk({ id: "a", sort_order: 0 }),
      mk({ id: "b", sort_order: 1 }),
      mk({ id: "c", sort_order: 2 }),
    ];
    const r = computeSwap(slots, "b", "up");
    expect(r).toEqual({
      slotA: { id: "b", sort_order: 0 },
      slotB: { id: "a", sort_order: 1 },
    });
  });

  it("swaps sort_order with neighbour below when moving down", () => {
    const slots = [
      mk({ id: "a", sort_order: 0 }),
      mk({ id: "b", sort_order: 1 }),
      mk({ id: "c", sort_order: 2 }),
    ];
    const r = computeSwap(slots, "b", "down");
    expect(r).toEqual({
      slotA: { id: "b", sort_order: 2 },
      slotB: { id: "c", sort_order: 1 },
    });
  });

  it("returns null when moving the first slot up", () => {
    const slots = [mk({ id: "a", sort_order: 0 }), mk({ id: "b", sort_order: 1 })];
    expect(computeSwap(slots, "a", "up")).toBeNull();
  });

  it("returns null when moving the last slot down", () => {
    const slots = [mk({ id: "a", sort_order: 0 }), mk({ id: "b", sort_order: 1 })];
    expect(computeSwap(slots, "b", "down")).toBeNull();
  });

  it("returns null when the slot doesn't exist", () => {
    expect(computeSwap([mk({ id: "a" })], "missing", "up")).toBeNull();
  });

  it("ignores slots from a different day", () => {
    const slots = [
      mk({ id: "a", day: "d1", sort_order: 0 }),
      mk({ id: "b", day: "d2", sort_order: 0 }),  // different day, same order — irrelevant
      mk({ id: "c", day: "d1", sort_order: 1 }),
    ];
    const r = computeSwap(slots, "a", "down");
    // "a" in d1 should swap with "c" (next in d1), not "b" (different day)
    expect(r).toEqual({
      slotA: { id: "a", sort_order: 1 },
      slotB: { id: "c", sort_order: 0 },
    });
  });

  it("handles slots that are sorted by sort_order even if array order differs", () => {
    const slots = [
      mk({ id: "c", sort_order: 2 }),
      mk({ id: "a", sort_order: 0 }),
      mk({ id: "b", sort_order: 1 }),
    ];
    const r = computeSwap(slots, "b", "up");
    // After sort: a(0), b(1), c(2). b up → swap with a.
    expect(r).toEqual({
      slotA: { id: "b", sort_order: 0 },
      slotB: { id: "a", sort_order: 1 },
    });
  });
});
