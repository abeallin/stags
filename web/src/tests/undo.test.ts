import { describe, it, expect } from "vitest";
import { buildUndoOps } from "../lib/undo";
import type { Edit, Slot, Day } from "../lib/types";

const slotBefore: Slot = {
  id: "sl1", day: "d1",
  start_time: "2026-06-03T20:00",
  time_label: "8pm",
  title: "Arrive",
  note: "Land + check in",
  tags: [{ label: "L4 metro", kind: "train" }],
  is_featured: false,
  sort_order: 2,
};

const dayBefore: Day = {
  id: "d1", stag: "s1",
  date: "2026-06-03",
  title: "Arrival",
  subtitle: "",
  sort_order: 0,
};

function mkEdit(partial: Partial<Edit>): Edit {
  return {
    id: "e1", stag: "s1", kind: "", target_id: "",
    before: null, after: null, who: "Tom",
    created: "2026-05-20T12:00:00Z",
    ...partial,
  };
}

describe("buildUndoOps", () => {
  it("slot.update → restores six tracked fields", () => {
    const ops = buildUndoOps(mkEdit({ kind: "slot.update", target_id: "sl1", before: slotBefore }));
    expect(ops).toHaveLength(1);
    expect(ops[0]).toEqual({
      op: "update", collection: "slots", id: "sl1",
      data: {
        start_time: "2026-06-03T20:00",
        time_label: "8pm",
        title: "Arrive",
        note: "Land + check in",
        tags: [{ label: "L4 metro", kind: "train" }],
        is_featured: false,
        map_url: "",
        website_url: "",
      },
    });
    expect(ops[0]).not.toHaveProperty("data.id");
    expect(ops[0]).not.toHaveProperty("data.sort_order");
  });

  it("slot.update with null before → no-op", () => {
    const ops = buildUndoOps(mkEdit({ kind: "slot.update", target_id: "sl1", before: null }));
    expect(ops).toEqual([]);
  });

  it("slot.create → delete the created slot", () => {
    const ops = buildUndoOps(mkEdit({ kind: "slot.create", target_id: "sl1" }));
    expect(ops).toEqual([{ op: "delete", collection: "slots", id: "sl1" }]);
  });

  it("slot.delete → recreate without id; sort_order preserved", () => {
    const ops = buildUndoOps(mkEdit({ kind: "slot.delete", target_id: "sl1", before: slotBefore }));
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe("create");
    if (ops[0].op === "create") {
      expect(ops[0].collection).toBe("slots");
      expect(ops[0].data).toMatchObject({
        day: "d1", start_time: "2026-06-03T20:00", title: "Arrive", sort_order: 2,
      });
      expect(ops[0].data).not.toHaveProperty("id");
    }
  });

  it("slot.reorder → two updates swapping sort_order", () => {
    const before = { sort_order: 3, neighbour: "sl2", neighbourOrder: 4 };
    const ops = buildUndoOps(mkEdit({ kind: "slot.reorder", target_id: "sl1", before, after: {} }));
    expect(ops).toEqual([
      { op: "update", collection: "slots", id: "sl1", data: { sort_order: 3 } },
      { op: "update", collection: "slots", id: "sl2", data: { sort_order: 4 } },
    ]);
  });

  it("day.create → delete the created day", () => {
    const ops = buildUndoOps(mkEdit({ kind: "day.create", target_id: "d1" }));
    expect(ops).toEqual([{ op: "delete", collection: "days", id: "d1" }]);
  });

  it("day.delete → recreate day without id", () => {
    const ops = buildUndoOps(mkEdit({ kind: "day.delete", target_id: "d1", before: dayBefore }));
    expect(ops).toHaveLength(1);
    if (ops[0].op === "create") {
      expect(ops[0].collection).toBe("days");
      expect(ops[0].data).toEqual({
        stag: "s1", date: "2026-06-03", title: "Arrival", subtitle: "", sort_order: 0,
      });
    }
  });

  it("unknown kind → no-op", () => {
    const ops = buildUndoOps(mkEdit({ kind: "mystery.thing", target_id: "x" }));
    expect(ops).toEqual([]);
  });
});
