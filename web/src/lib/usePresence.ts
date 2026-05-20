import { useEffect, useState } from "react";
import { pb } from "./pb";
import type { PresenceRow } from "./types";

const SESSION_ID = Math.random().toString(36).slice(2, 12);
const HEARTBEAT_MS = 20_000;
const ACTIVE_WINDOW_MS = 60_000;

export function usePresence(stagId: string | undefined, displayName: string) {
  const [viewers, setViewers] = useState<PresenceRow[]>([]);

  useEffect(() => {
    if (!stagId || !displayName) return;
    let stopped = false;
    let unsub: (() => void) | undefined;
    let recordId: string | undefined;

    async function start() {
      // Try to find an existing row for this session
      try {
        const existing = await pb.collection("presence").getFirstListItem<PresenceRow>(
          `session_id="${SESSION_ID}"`,
        );
        recordId = existing.id;
      } catch (_) {
        const created = await pb.collection("presence").create<PresenceRow>({
          stag: stagId,
          session_id: SESSION_ID,
          display_name: displayName,
          last_seen: new Date().toISOString(),
        });
        recordId = created.id;
      }

      async function tick() {
        if (stopped || !recordId) return;
        try {
          await pb.collection("presence").update(recordId, { last_seen: new Date().toISOString() });
        } catch (_) {}
        setTimeout(tick, HEARTBEAT_MS);
      }
      tick();

      async function refresh() {
        if (stopped) return;
        const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
        const list = await pb.collection("presence").getFullList<PresenceRow>({
          filter: `stag="${stagId}" && last_seen >= "${cutoff}"`,
          sort:   "-last_seen",
        });
        setViewers(list);
        setTimeout(refresh, 10_000);
      }
      refresh();

      const u = await pb.collection("presence").subscribe<PresenceRow>("*", () => refresh());
      unsub = () => u();
    }

    start();
    return () => {
      stopped = true;
      if (unsub) unsub();
      if (recordId) pb.collection("presence").delete(recordId).catch(() => {});
    };
  }, [stagId, displayName]);

  return viewers;
}
