import type { Slot } from "./types";

type SlotState = "past" | "now" | "future";

export interface CollapsePlan {
  /** Leading contiguous run of past-state slot ids, in render order. */
  collapsedIds: string[];
  /** True when every slot in the day is past (end-of-day recap case). */
  allPast: boolean;
}

/**
 * Decide which leading past slots fold away on today's day. Past slots are
 * always contiguous from the top (the now slot, if any, separates past from
 * future), so we collect the leading run until we hit a non-past slot.
 */
export function planCollapse(
  slots: Slot[],
  states: Map<string, SlotState> | undefined,
): CollapsePlan {
  if (!states || states.size === 0) return { collapsedIds: [], allPast: false };
  const collapsedIds: string[] = [];
  for (const s of slots) {
    if (states.get(s.id) === "past") collapsedIds.push(s.id);
    else break;
  }
  const allPast = slots.length > 0 && collapsedIds.length === slots.length;
  return { collapsedIds, allPast };
}

/** The slot currently in the "now" state on today's day, or null. */
export function findNowSlot(
  slots: Slot[],
  states: Map<string, SlotState> | undefined,
): Slot | null {
  if (!states) return null;
  for (const s of slots) if (states.get(s.id) === "now") return s;
  return null;
}
