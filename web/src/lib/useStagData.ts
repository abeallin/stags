import { useEffect, useState } from "react";
import { pb } from "./pb";
import type { Stag, Day, Slot } from "./types";

export interface StagBundle {
  stag: Stag;
  days: Day[];
  slots: Slot[];
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
        // Effect already torn down; unsubscribe immediately
        wrapped();
      } else {
        unsubs.push(wrapped);
      }
    }

    async function load() {
      try {
        const stag = await pb.collection("stags").getFirstListItem<Stag>(`slug="${slug}"`);
        const days = await pb.collection("days").getFullList<Day>({
          filter: `stag="${stag.id}"`,
          sort:   "sort_order",
        });
        const slots = days.length === 0 ? [] : await pb.collection("slots").getFullList<Slot>({
          filter: days.map(d => `day="${d.id}"`).join(" || "),
          sort:   "sort_order",
        });
        if (cancelled) return;
        setBundle({ stag, days, slots });

        await safeSubscribe<Stag>("stags", stag.id, (e) => {
          setBundle(b => b ? { ...b, stag: e.record } : b);
        });

        await safeSubscribe<Day>("days", "*", (e) => {
          setBundle(b => {
            if (!b || e.record.stag !== stag.id) return b;
            const next = { ...b };
            if (e.action === "create") next.days = [...b.days, e.record];
            if (e.action === "update") next.days = b.days.map(d => d.id === e.record.id ? e.record : d);
            if (e.action === "delete") next.days = b.days.filter(d => d.id !== e.record.id);
            next.days.sort((a, b) => a.sort_order - b.sort_order);
            return next;
          });
        });

        await safeSubscribe<Slot>("slots", "*", (e) => {
          setBundle(b => {
            if (!b) return b;
            const dayBelongsToStag = b.days.some(d => d.id === e.record.day);
            if (!dayBelongsToStag && e.action !== "delete") return b;
            const next = { ...b };
            if (e.action === "create") next.slots = [...b.slots, e.record];
            if (e.action === "update") next.slots = b.slots.map(s => s.id === e.record.id ? e.record : s);
            if (e.action === "delete") next.slots = b.slots.filter(s => s.id !== e.record.id);
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
