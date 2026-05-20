import type { Stag, Day, Slot, TripState } from "./types";

export function determineTripState(stag: Stag, now: Date): TripState {
  const start = new Date(stag.start_date + "T00:00");
  const end   = new Date(stag.end_date   + "T23:59:59");
  if (now < start) return "pre";
  if (now > end)   return "post";
  return "in";
}

export function findTodayDayId(days: Day[], now: Date): string | null {
  const yyyyMmDd = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const today = yyyyMmDd(now);
  return days.find(d => d.date === today)?.id ?? null;
}

export function findCurrentSlot(
  allSlots: Slot[],
  dayId: string,
  now: Date,
): string | null {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const slots = allSlots
    .filter(s => s.day === dayId)
    .map(s => ({ ...s, start: new Date(s.start_time) }))
    .sort((a, b) => +a.start - +b.start);

  if (slots.length === 0) return null;
  if (now < slots[0].start) return null;

  for (let i = 0; i < slots.length; i++) {
    const cur  = slots[i];
    const next = slots[i + 1];
    const upper = next ? next.start : dayEnd;
    if (now >= cur.start && now < upper) return cur.id;
  }
  return slots[slots.length - 1].id;
}

export function formatTMinus(startDate: string, now: Date): string {
  const start = new Date(startDate + "T00:00");
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((+start - +today) / msPerDay);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "T-minus 1 day";
  return `T-minus ${diffDays} days`;
}

export function slotStateMap(
  slots: Slot[],
  dayId: string,
  now: Date,
): Map<string, "past" | "now" | "future"> {
  const m = new Map<string, "past" | "now" | "future">();
  const currentId = findCurrentSlot(slots, dayId, now);
  const daySlots = slots
    .filter(s => s.day === dayId)
    .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));

  let foundCurrent = false;
  for (const s of daySlots) {
    if (s.id === currentId) { m.set(s.id, "now"); foundCurrent = true; continue; }
    m.set(s.id, foundCurrent ? "future" : "past");
  }
  // Adjustment: if no current slot (pre-first-slot of the day), all slots are future
  if (!currentId) {
    for (const s of daySlots) m.set(s.id, "future");
  }
  return m;
}
