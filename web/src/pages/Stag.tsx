import { useEffect, useState, useMemo } from "react";
import { useStagData } from "../lib/useStagData";
import { determineTripState, findTodayDayId, formatTMinus, slotStateMap } from "../lib/time";
import Header from "../components/Header";
import DayTabs from "../components/DayTabs";
import Day from "../components/Day";
import PassphraseGate from "../components/PassphraseGate";
import { pb } from "../lib/pb";

export default function Stag({ slug }: { slug: string }) {
  const { bundle, error } = useStagData(slug);
  const [activeDayId, setActiveDayId] = useState<string>("");
  const [userPickedDay, setUserPickedDay] = useState(false);
  const [now, setNow] = useState(new Date());
  const [editing, setEditing] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [displayName, setDisplayName] = useState<string>(localStorage.getItem("stags.displayName") ?? "");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (bundle?.stag.accent_color) {
      document.documentElement.style.setProperty("--accent", bundle.stag.accent_color);
    }
  }, [bundle]);

  useEffect(() => {
    if (!bundle || userPickedDay) return;
    const state = determineTripState(bundle.stag, now);
    if (state === "in") {
      const todayId = findTodayDayId(bundle.days, now);
      setActiveDayId(todayId ?? bundle.days[0]?.id ?? "");
    } else if (state === "post") {
      setActiveDayId(bundle.days[bundle.days.length - 1]?.id ?? "");
    } else {
      setActiveDayId(bundle.days[0]?.id ?? "");
    }
  }, [bundle, userPickedDay, now]);

  useEffect(() => {
    document.body.classList.toggle("editing", editing);
    return () => document.body.classList.remove("editing");
  }, [editing]);

  async function handleSlotSave(slotId: string, patch: Partial<import("../lib/types").Slot>) {
    if (!bundle) return;
    const before = bundle.slots.find(s => s.id === slotId);
    await pb.collection("slots").update(slotId, patch);
    await pb.collection("edits").create({
      stag:      bundle.stag.id,
      kind:      "slot.update",
      target_id: slotId,
      before,
      after:     { ...before, ...patch },
      who:       displayName || "anon",
    });
  }

  async function handleSlotDelete(slotId: string) {
    if (!bundle) return;
    const before = bundle.slots.find(s => s.id === slotId);
    await pb.collection("slots").delete(slotId);
    await pb.collection("edits").create({
      stag:      bundle.stag.id,
      kind:      "slot.delete",
      target_id: slotId,
      before,
      after:     null,
      who:       displayName || "anon",
    });
  }

  async function handleSlotMove(slotId: string, direction: "up" | "down") {
    if (!bundle) return;
    const slot = bundle.slots.find(s => s.id === slotId);
    if (!slot) return;
    const daySlots = bundle.slots
      .filter(s => s.day === slot.day)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = daySlots.findIndex(s => s.id === slotId);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= daySlots.length) return;
    const neighbour = daySlots[targetIdx];
    await pb.collection("slots").update(slot.id,      { sort_order: neighbour.sort_order });
    await pb.collection("slots").update(neighbour.id, { sort_order: slot.sort_order });
    await pb.collection("edits").create({
      stag:      bundle.stag.id,
      kind:      "slot.reorder",
      target_id: slotId,
      before:    { sort_order: slot.sort_order, neighbour: neighbour.id, neighbourOrder: neighbour.sort_order },
      after:     { sort_order: neighbour.sort_order, neighbour: neighbour.id, neighbourOrder: slot.sort_order },
      who:       displayName || "anon",
    });
  }

  function handleToggleEdit() {
    if (editing) {
      setEditing(false);
      return;
    }
    if (pb.authStore.isValid) {
      setEditing(true);
    } else {
      setShowGate(true);
    }
  }

  const slotsByDay = useMemo(() => {
    const m = new Map<string, import("../lib/types").Slot[]>();
    if (!bundle) return m;
    for (const s of bundle.slots) {
      const list = m.get(s.day) ?? [];
      list.push(s);
      m.set(s.day, list);
    }
    return m;
  }, [bundle]);

  const slotStates = useMemo(() => {
    if (!bundle) return new Map<string, Map<string, "past" | "now" | "future">>();
    const all = new Map<string, Map<string, "past" | "now" | "future">>();
    const todayId = findTodayDayId(bundle.days, now);
    for (const d of bundle.days) {
      all.set(d.id, d.id === todayId ? slotStateMap(bundle.slots, d.id, now) : new Map());
    }
    return all;
  }, [bundle, now]);

  if (error)   return <div style={{ padding: 24 }}>Failed to load: {error}</div>;
  if (!bundle) return <div style={{ padding: 24 }}>Loading…</div>;

  const state = determineTripState(bundle.stag, now);
  const badge =
    state === "pre"  ? formatTMinus(bundle.stag.start_date, now) :
    state === "post" ? "Trip complete" : undefined;

  return (
    <div className="container">
      <Header
        stag={bundle.stag}
        tripBadge={badge}
        editing={editing}
        onToggleEdit={handleToggleEdit}
      />
      <DayTabs
        days={bundle.days}
        activeDayId={activeDayId}
        onSelect={(id) => { setActiveDayId(id); setUserPickedDay(true); }}
      />
      {bundle.days.map(d => (
        <Day
          key={d.id}
          day={d}
          slots={slotsByDay.get(d.id) ?? []}
          active={d.id === activeDayId}
          slotStates={slotStates.get(d.id)}
          onSlotSave={editing ? handleSlotSave : undefined}
          onSlotDelete={editing ? handleSlotDelete : undefined}
          onSlotMove={editing ? handleSlotMove : undefined}
        />
      ))}
      {showGate && (
        <PassphraseGate
          slug={slug}
          onAuthed={(name) => {
            setDisplayName(name);
            setShowGate(false);
            setEditing(true);
          }}
          onCancel={() => setShowGate(false)}
        />
      )}
    </div>
  );
}
