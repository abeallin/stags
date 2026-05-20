import type { Slot } from "./types";

export interface SwapOps {
  slotA: { id: string; sort_order: number };
  slotB: { id: string; sort_order: number };
}

export function computeSwap(
  allSlots: Slot[],
  slotId: string,
  direction: "up" | "down",
): SwapOps | null {
  const slot = allSlots.find(s => s.id === slotId);
  if (!slot) return null;
  const daySlots = allSlots
    .filter(s => s.day === slot.day)
    .sort((a, b) => a.sort_order - b.sort_order);
  const idx = daySlots.findIndex(s => s.id === slotId);
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= daySlots.length) return null;
  const neighbour = daySlots[targetIdx];
  return {
    slotA: { id: slot.id,      sort_order: neighbour.sort_order },
    slotB: { id: neighbour.id, sort_order: slot.sort_order },
  };
}
