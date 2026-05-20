import { useEffect, useState, useMemo } from "react";
import { useStagData } from "../lib/useStagData";
import { useEditHistory } from "../lib/useEditHistory";
import { usePresence } from "../lib/usePresence";
import { determineTripState, findTodayDayId, formatTMinus, slotStateMap } from "../lib/time";
import { buildUndoOps } from "../lib/undo";
import { computeSwap } from "../lib/reorder";
import Header from "../components/Header";
import DayTabs from "../components/DayTabs";
import Day from "../components/Day";
import { pb } from "../lib/pb";
import type { Slot as SlotType } from "../lib/types";

const DISPLAY_NAME_KEY = "stags.displayName";

export default function Stag({ slug }: { slug: string }) {
  const { bundle, error } = useStagData(slug);
  const [activeDayId, setActiveDayId] = useState<string>("");
  const [userPickedDay, setUserPickedDay] = useState(false);
  const [now, setNow] = useState(new Date());
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState<string>(localStorage.getItem(DISPLAY_NAME_KEY) ?? "");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!bundle) return;
    document.documentElement.style.setProperty("--accent", bundle.stag.accent_color);
    const link = document.getElementById("dynamic-manifest") as HTMLLinkElement | null;
    if (link) link.href = `${import.meta.env.BASE_URL}manifest-${slug}.webmanifest`;
    document.title = bundle.stag.name;
  }, [bundle, slug]);

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

  const edits = useEditHistory(bundle?.stag.id);
  const lastEdit = edits[0];
  const viewers = usePresence(bundle?.stag.id, displayName);

  async function handleUndo() {
    if (!lastEdit || !bundle) return;
    const ops = buildUndoOps(lastEdit);
    if (ops.length === 0) return;
    try {
      for (const op of ops) {
        if (op.op === "update") await pb.collection(op.collection).update(op.id, op.data);
        else if (op.op === "delete") await pb.collection(op.collection).delete(op.id);
        else if (op.op === "create") await pb.collection(op.collection).create(op.data);
      }
      await pb.collection("edits").delete(lastEdit.id);
    } catch (err) {
      alert(`Couldn't undo: ${String(err)}`);
    }
  }

  async function handleSlotSave(slotId: string, patch: Partial<SlotType>) {
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
    const swap = computeSwap(bundle.slots, slotId, direction);
    if (!swap) return;
    await pb.collection("slots").update(swap.slotA.id, { sort_order: swap.slotA.sort_order });
    await pb.collection("slots").update(swap.slotB.id, { sort_order: swap.slotB.sort_order });
    await pb.collection("edits").create({
      stag:      bundle.stag.id,
      kind:      "slot.reorder",
      target_id: slotId,
      before:    { sort_order: swap.slotB.sort_order, neighbour: swap.slotB.id, neighbourOrder: swap.slotA.sort_order },
      after:     { sort_order: swap.slotA.sort_order, neighbour: swap.slotB.id, neighbourOrder: swap.slotB.sort_order },
      who:       displayName || "anon",
    });
  }

  async function handleAddSlot(dayId: string) {
    if (!bundle) return;
    const daySlots = bundle.slots.filter(s => s.day === dayId);
    const nextOrder = daySlots.length === 0 ? 0 : Math.max(...daySlots.map(s => s.sort_order)) + 1;
    const day = bundle.days.find(d => d.id === dayId);
    if (!day) return;
    const created = await pb.collection("slots").create({
      day:         dayId,
      start_time:  `${day.date}T12:00`,
      time_label:  "12:00pm · new slot",
      title:       "New slot",
      note:        "",
      tags:        [],
      is_featured: false,
      sort_order:  nextOrder,
    });
    await pb.collection("edits").create({
      stag:      bundle.stag.id,
      kind:      "slot.create",
      target_id: created.id,
      before:    null,
      after:     created,
      who:       displayName || "anon",
    });
  }

  async function handleAddDay() {
    if (!bundle) return;
    const nextOrder = bundle.days.length === 0 ? 0 : Math.max(...bundle.days.map(d => d.sort_order)) + 1;
    const lastDate = bundle.days[bundle.days.length - 1]?.date ?? bundle.stag.end_date;
    const newDate = new Date(lastDate + "T00:00");
    newDate.setDate(newDate.getDate() + 1);
    const dateStr = newDate.toISOString().slice(0, 10);
    const created = await pb.collection("days").create({
      stag:       bundle.stag.id,
      date:       dateStr,
      title:      "New day",
      subtitle:   "",
      sort_order: nextOrder,
    });
    await pb.collection("edits").create({
      stag:      bundle.stag.id,
      kind:      "day.create",
      target_id: created.id,
      before:    null,
      after:     created,
      who:       displayName || "anon",
    });
  }

  async function handleDeleteDay(dayId: string) {
    if (!bundle) return;
    const before = bundle.days.find(d => d.id === dayId);
    if (!confirm(`Delete day "${before?.title}" and all its slots?`)) return;
    await pb.collection("days").delete(dayId);
    await pb.collection("edits").create({
      stag:      bundle.stag.id,
      kind:      "day.delete",
      target_id: dayId,
      before,
      after:     null,
      who:       displayName || "anon",
    });
  }

  function handleToggleEdit() {
    if (editing) {
      setEditing(false);
      return;
    }
    let name = displayName;
    if (!name) {
      name = (window.prompt("Your name (lads see this on edits):") ?? "").trim();
      if (name) {
        localStorage.setItem(DISPLAY_NAME_KEY, name);
        setDisplayName(name);
      }
    }
    setEditing(true);
  }

  const slotsByDay = useMemo(() => {
    const m = new Map<string, SlotType[]>();
    if (!bundle) return m;
    for (const s of bundle.slots) {
      const list = m.get(s.day) ?? [];
      list.push(s);
      m.set(s.day, list);
    }
    return m;
  }, [bundle?.slots]);

  const slotStates = useMemo(() => {
    if (!bundle) return new Map<string, Map<string, "past" | "now" | "future">>();
    const all = new Map<string, Map<string, "past" | "now" | "future">>();
    const todayId = findTodayDayId(bundle.days, now);
    for (const d of bundle.days) {
      all.set(d.id, d.id === todayId ? slotStateMap(bundle.slots, d.id, now) : new Map());
    }
    return all;
  }, [bundle?.days, bundle?.slots, now]);

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
        lastEdit={lastEdit}
        onUndo={editing ? handleUndo : undefined}
        viewers={viewers}
      />
      <DayTabs
        days={bundle.days}
        activeDayId={activeDayId}
        onSelect={(id) => { setActiveDayId(id); setUserPickedDay(true); }}
        onAddDay={editing ? handleAddDay : undefined}
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
          onAddSlot={editing ? handleAddSlot : undefined}
          onDeleteDay={editing ? handleDeleteDay : undefined}
        />
      ))}
    </div>
  );
}
