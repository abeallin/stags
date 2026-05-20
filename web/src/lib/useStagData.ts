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
        if (!cancelled) setBundle({ stag, days, slots });
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    load();
    return () => { cancelled = true; };
  }, [slug]);

  return { bundle, error, setBundle };
}
