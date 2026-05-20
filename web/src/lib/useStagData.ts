import { useEffect, useState } from "react";
import { pb } from "./pb";
import type { Stag, Day, Slot } from "./types";

export interface StagBundle {
  stag: Stag;
  days: Day[];
  slots: Slot[];
}

// PocketBase returns dates as "YYYY-MM-DD HH:MM:SS.sssZ"; the app assumes
// the bare "YYYY-MM-DD" form for day-level dates and ISO "YYYY-MM-DDTHH:mm"
// for slot start_time. Normalize at the data boundary so consumers stay simple.
function normalizeStag(s: Stag): Stag {
  return { ...s, start_date: s.start_date.slice(0, 10), end_date: s.end_date.slice(0, 10) };
}
function normalizeDay(d: Day): Day {
  return { ...d, date: d.date.slice(0, 10) };
}
function normalizeSlot(s: Slot): Slot {
  // start_time of "2026-06-03 22:00:00.000Z" → "2026-06-03T22:00"
  const raw = s.start_time;
  const norm = raw.length >= 16 ? raw.slice(0, 10) + "T" + raw.slice(11, 16) : raw;
  return { ...s, start_time: norm };
}

export function useStagData(slug: string) {
  const [bundle, setBundle] = useState<StagBundle | null>(null);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    async function safeSubscribe<T extends { id: string }>(
      collection: string,
      topic: string,
      handler: (e: { action: string; record: T }) => void,
    ) {
      const unsub = await pb.collection(collection).subscribe<T>(topic, handler);
      const wrapped = () => { unsub(); };
      if (cancelled) {
        wrapped();
      } else {
        unsubs.push(wrapped);
      }
    }

    async function load() {
      try {
        const rawStag = await pb.collection("stags").getFirstListItem<Stag>(`slug="${slug}"`);
        const stag = normalizeStag(rawStag);
        const rawDays = await pb.collection("days").getFullList<Day>({
          filter: `stag="${stag.id}"`,
          sort:   "sort_order",
        });
        const days = rawDays.map(normalizeDay);
        const rawSlots = days.length === 0 ? [] : await pb.collection("slots").getFullList<Slot>({
          filter: days.map(d => `day="${d.id}"`).join(" || "),
          sort:   "sort_order",
        });
        const slots = rawSlots.map(normalizeSlot);
        if (cancelled) return;
        setBundle({ stag, days, slots });

        await safeSubscribe<Stag>("stags", stag.id, (e) => {
          const rec = normalizeStag(e.record);
          setBundle(b => b ? { ...b, stag: rec } : b);
        });

        await safeSubscribe<Day>("days", "*", (e) => {
          const rec = normalizeDay(e.record);
          setBundle(b => {
            if (!b || rec.stag !== stag.id) return b;
            const next = { ...b };
            if (e.action === "create") next.days = [...b.days, rec];
            if (e.action === "update") next.days = b.days.map(d => d.id === rec.id ? rec : d);
            if (e.action === "delete") next.days = b.days.filter(d => d.id !== rec.id);
            next.days.sort((a, b) => a.sort_order - b.sort_order);
            return next;
          });
        });

        await safeSubscribe<Slot>("slots", "*", (e) => {
          const rec = normalizeSlot(e.record);
          setBundle(b => {
            if (!b) return b;
            const dayBelongsToStag = b.days.some(d => d.id === rec.day);
            if (!dayBelongsToStag && e.action !== "delete") return b;
            const next = { ...b };
            if (e.action === "create") next.slots = [...b.slots, rec];
            if (e.action === "update") next.slots = b.slots.map(s => s.id === rec.id ? rec : s);
            if (e.action === "delete") next.slots = b.slots.filter(s => s.id !== rec.id);
            return next;
          });
        });
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    load();
    return () => {
      cancelled = true;
      for (const u of unsubs) u();
    };
  }, [slug]);

  return { bundle, error, setBundle };
}
