import type { Edit, Slot, Day } from "./types";

export type UndoOp =
  | { op: "update"; collection: "slots" | "days"; id: string; data: Record<string, unknown> }
  | { op: "delete"; collection: "slots" | "days"; id: string }
  | { op: "create"; collection: "slots" | "days"; data: Record<string, unknown> };

// PocketBase rejects "YYYY-MM-DDTHH:MM" (no seconds). useStagData normalizes
// reads to that shorter form for client time-math; pad when writing back.
function padSeconds(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso) ? `${iso}:00` : iso;
}

export function buildUndoOps(edit: Edit): UndoOp[] {
  switch (edit.kind) {
    case "slot.update": {
      if (!edit.before) return [];
      const before = edit.before as Slot;
      return [{
        op: "update", collection: "slots", id: edit.target_id,
        data: {
          start_time:  padSeconds(before.start_time),
          time_label:  before.time_label,
          title:       before.title,
          note:        before.note,
          tags:        before.tags,
          is_featured: before.is_featured,
          map_url:     before.map_url ?? "",
          website_url: before.website_url ?? "",
        },
      }];
    }
    case "slot.create":
      return [{ op: "delete", collection: "slots", id: edit.target_id }];
    case "slot.delete": {
      if (!edit.before) return [];
      const before = edit.before as Slot;
      return [{
        op: "create", collection: "slots",
        data: {
          day:         before.day,
          start_time:  padSeconds(before.start_time),
          time_label:  before.time_label,
          title:       before.title,
          note:        before.note,
          tags:        before.tags,
          is_featured: before.is_featured,
          sort_order:  before.sort_order,
          map_url:     before.map_url ?? "",
          website_url: before.website_url ?? "",
        },
      }];
    }
    case "slot.reorder": {
      if (!edit.before) return [];
      const b = edit.before as { sort_order: number; neighbour: string; neighbourOrder: number };
      return [
        { op: "update", collection: "slots", id: edit.target_id, data: { sort_order: b.sort_order } },
        { op: "update", collection: "slots", id: b.neighbour,    data: { sort_order: b.neighbourOrder } },
      ];
    }
    case "day.create":
      return [{ op: "delete", collection: "days", id: edit.target_id }];
    case "day.delete": {
      if (!edit.before) return [];
      const before = edit.before as Day;
      return [{
        op: "create", collection: "days",
        data: {
          stag:       before.stag,
          date:       before.date,
          title:      before.title,
          subtitle:   before.subtitle,
          sort_order: before.sort_order,
        },
      }];
    }
    default:
      return [];
  }
}
