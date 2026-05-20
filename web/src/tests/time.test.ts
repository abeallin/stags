import { describe, it, expect } from "vitest";
import {
  determineTripState,
  findCurrentSlot,
  findTodayDayId,
  formatTMinus,
  slotStateMap,
} from "../lib/time";
import type { Stag, Day, Slot } from "../lib/types";

const stag: Stag = {
  id: "s1", slug: "bcn", name: "Barcelona", accent_color: "#c84a2c",
  start_date: "2026-06-03", end_date: "2026-06-07",
  eyebrow_text: "", header_meta_html: "",
};

const days: Day[] = [
  { id: "d1", stag: "s1", date: "2026-06-03", title: "Arrival",   subtitle: "", sort_order: 0 },
  { id: "d2", stag: "s1", date: "2026-06-04", title: "Primavera", subtitle: "", sort_order: 1 },
];

const slots: Slot[] = [
  { id: "sl1", day: "d1", start_time: "2026-06-03T20:00", time_label: "8pm", title: "Arrive", note: "", tags: [], is_featured: false, sort_order: 0 },
  { id: "sl2", day: "d1", start_time: "2026-06-03T22:00", time_label: "10pm", title: "Bar",   note: "", tags: [], is_featured: false, sort_order: 1 },
  { id: "sl3", day: "d2", start_time: "2026-06-04T11:00", time_label: "11am", title: "Coffee", note: "", tags: [], is_featured: false, sort_order: 0 },
];

describe("determineTripState", () => {
  it("returns 'pre' before start", () => {
    expect(determineTripState(stag, new Date("2026-06-02T12:00"))).toBe("pre");
  });
  it("returns 'in' during trip", () => {
    expect(determineTripState(stag, new Date("2026-06-05T09:00"))).toBe("in");
  });
  it("returns 'post' after end of last day", () => {
    expect(determineTripState(stag, new Date("2026-06-08T01:00"))).toBe("post");
  });
  it("returns 'in' on the morning of day 1 even before first slot", () => {
    expect(determineTripState(stag, new Date("2026-06-03T08:00"))).toBe("in");
  });
});

describe("findTodayDayId", () => {
  it("returns today's day id if today matches a day", () => {
    expect(findTodayDayId(days, new Date("2026-06-04T10:30"))).toBe("d2");
  });
  it("returns null if today doesn't match a day", () => {
    expect(findTodayDayId(days, new Date("2026-06-01T10:30"))).toBe(null);
  });
});

describe("findCurrentSlot", () => {
  it("returns the slot currently in progress", () => {
    const r = findCurrentSlot(slots, "d1", new Date("2026-06-03T21:30"));
    expect(r).toBe("sl1");
  });
  it("returns the next slot once its start_time passes", () => {
    const r = findCurrentSlot(slots, "d1", new Date("2026-06-03T22:00"));
    expect(r).toBe("sl2");
  });
  it("returns null if before the first slot of the day", () => {
    const r = findCurrentSlot(slots, "d1", new Date("2026-06-03T18:00"));
    expect(r).toBe(null);
  });
  it("keeps the last slot as current until end of day", () => {
    const r = findCurrentSlot(slots, "d1", new Date("2026-06-03T23:59"));
    expect(r).toBe("sl2");
  });
});

describe("formatTMinus", () => {
  it("formats whole days until start", () => {
    expect(formatTMinus("2026-06-03", new Date("2026-05-30T12:00"))).toBe("T-minus 4 days");
  });
  it("says 'tomorrow' when one day out", () => {
    expect(formatTMinus("2026-06-03", new Date("2026-06-02T12:00"))).toBe("T-minus 1 day");
  });
  it("returns 'today' when same day", () => {
    expect(formatTMinus("2026-06-03", new Date("2026-06-03T09:00"))).toBe("Today");
  });
});

describe("slotStateMap", () => {
  it("assigns states by chronological order, not sort_order", () => {
    // Two slots in the same day. sort_order is reversed vs start_time.
    const slotsOutOfOrder: Slot[] = [
      { id: "a", day: "d1", start_time: "2026-06-03T22:00", time_label: "10pm", title: "Bar",    note: "", tags: [], is_featured: false, sort_order: 0 },
      { id: "b", day: "d1", start_time: "2026-06-03T20:00", time_label: "8pm",  title: "Arrive", note: "", tags: [], is_featured: false, sort_order: 1 },
    ];
    // At 21:30: "b" (8pm) should be past or now, "a" (10pm) should still be future.
    const m = slotStateMap(slotsOutOfOrder, "d1", new Date("2026-06-03T21:30"));
    expect(m.get("b")).toBe("now");
    expect(m.get("a")).toBe("future");
  });
});
