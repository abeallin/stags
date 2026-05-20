import { useEffect, useState } from "react";
import { pb } from "./pb";
import type { Edit } from "./types";

export function useEditHistory(stagId: string | undefined) {
  const [edits, setEdits] = useState<Edit[]>([]);

  useEffect(() => {
    if (!stagId) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;

    async function load() {
      const list = await pb.collection("edits").getFullList<Edit>({
        filter: `stag="${stagId}"`,
        sort:   "-created",
      });
      if (cancelled) return;
      setEdits(list.slice(0, 20));
      const u = await pb.collection("edits").subscribe<Edit>("*", (e) => {
        if (e.record.stag !== stagId) return;
        setEdits(prev => {
          if (e.action === "create") return [e.record, ...prev].slice(0, 20);
          if (e.action === "delete") return prev.filter(r => r.id !== e.record.id);
          return prev;
        });
      });
      unsub = () => u();
    }

    load();
    return () => { cancelled = true; if (unsub) unsub(); };
  }, [stagId]);

  return edits;
}
