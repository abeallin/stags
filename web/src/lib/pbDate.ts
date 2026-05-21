// PocketBase quirks around date fields:
// - PATCH revalidates every "required" field, even ones not in the body. So
//   partial updates must include start_time (or any other required field) to
//   pass validation. Wrap update bodies through `withRequired` to merge them.
// - The date validator rejects "YYYY-MM-DDTHH:mm" — seconds are mandatory.
//   useStagData normalizes reads to the shorter form; pad before writing.

import type { Slot } from "./types";

export function padSeconds(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso) ? `${iso}:00` : iso;
}

/** Merge a partial slot update with the start_time PB needs on every PATCH. */
export function withSlotRequired(patch: Partial<Slot>, existing: Slot): Partial<Slot> {
  const start_time = patch.start_time ?? existing.start_time;
  return { ...patch, start_time: padSeconds(start_time) };
}
