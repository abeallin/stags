import { describe, it, expect } from "vitest";
import { planCollapse, findNowSlot } from "../lib/todayView";
import type { Slot } from "../lib/types";

function slot(id: string, order: number): Slot {
  return {
    id, day: "d1", start_time: "2026-06-12T10:00", time_label: id,
    title: id, note: "", tags: [], is_featured: false, sort_order: order,
  };
}

const a = slot("a", 0), b = slot("b", 1), c = slot("c", 2), d = slot("d", 3);

type S = Map<string, "past" | "now" | "future">;
const states = (entries: [Slot, "past" | "now" | "future"][]): S =>
  new Map(entries.map(([s, st]) => [s.id, st]));

describe("planCollapse", () => {
  it("returns nothing when there is no state map (non-today day)", () => {
    expect(planCollapse([a, b], undefined)).toEqual({ collapsedIds: [], allPast: false });
  });

  it("collapses the leading contiguous run of past slots", () => {
    const plan = planCollapse([a, b, c, d], states([[a, "past"], [b, "past"], [c, "now"], [d, "future"]]));
    expect(plan.collapsedIds).toEqual(["a", "b"]);
    expect(plan.allPast).toBe(false);
  });

  it("collapses nothing when the first slot is current", () => {
    const plan = planCollapse([a, b], states([[a, "now"], [b, "future"]]));
    expect(plan.collapsedIds).toEqual([]);
  });

  it("flags allPast when every slot is past", () => {
    const plan = planCollapse([a, b], states([[a, "past"], [b, "past"]]));
    expect(plan.collapsedIds).toEqual(["a", "b"]);
    expect(plan.allPast).toBe(true);
  });
});

describe("findNowSlot", () => {
  it("returns the slot marked now", () => {
    expect(findNowSlot([a, b, c], states([[a, "past"], [b, "now"], [c, "future"]]))?.id).toBe("b");
  });

  it("returns null when there is no now slot or no states", () => {
    expect(findNowSlot([a, b], states([[a, "past"], [b, "future"]]))).toBeNull();
    expect(findNowSlot([a, b], undefined)).toBeNull();
  });
});
