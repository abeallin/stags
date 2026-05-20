import { useEffect, useState, useMemo } from "react";
import { useStagData } from "../lib/useStagData";
import { useEditHistory } from "../lib/useEditHistory";
import { usePresence } from "../lib/usePresence";
import { determineTripState, findTodayDayId, formatTMinus, slotStateMap } from "../lib/time";
import Header from "../components/Header";
import DayTabs from "../components/DayTabs";
import Day from "../components/Day";
import PassphraseGate from "../components/PassphraseGate";
import { pb } from "../lib/pb";
import type { Slot as SlotType, Day as DayType } from "../lib/types";

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

  const edits = useEditHistory(bundle?.stag.id);
  const lastEdit = edits[0];
  const viewers = usePresence(bundle?.stag.id, displayName);

  async function handleUndo() {
    if (!lastEdit || !bundle) return;
    switch (lastEdit.kind) {
      case "slot.update":
        if (lastEdit.before) {
          const before = lastEdit.before as SlotType;
          await pb.collection("slots").update(lastEdit.target_id, {
            start_time:  before.start_time,
            time_label:  before.time_label,
            title:       before.title,
            note:        before.note,
            tags:        before.tags,
            is_featured: before.is_featured,
          });
        }
        break;
      case "slot.create":
        await pb.collection("slots").delete(lastEdit.target_id);
        break;
      case "slot.delete":
        if (lastEdit.before) {
          const before = lastEdit.before as SlotType;
          await pb.collection("slots").create({
            day:         before.day,
            start_time:  before.start_time,
            time_label:  before.time_label,
            title:       before.title,
            note:        before.note,
            tags:        before.tags,
            is_featured: before.is_featured,
            sort_order:  before.sort_order,
          });
        }
        break;
      case "slot.reorder":
        if (lastEdit.before && lastEdit.after) {
          const beforeData = lastEdit.before as { sort_order: number; neighbour: string; neighbourOrder: number };
          await pb.collection("slots").update(lastEdit.target_id, { sort_order: beforeData.sort_order });
          await pb.collection("slots").update(beforeData.neighbour, { sort_order: beforeData.neighbourOrder });
        }
        break;
      case "day.create":
        await pb.collection("days").delete(lastEdit.target_id);
        break;
      case "day.delete":
        if (lastEdit.before) {
          const before = lastEdit.before as DayType;
          await pb.collection("days").create({
            stag:       before.stag,
            date:       before.date,
            title:      before.title,
            subtitle:   before.subtitle,
            sort_order: before.sort_order,
          });
        }
        break;
    }
    await pb.collection("edits").delete(lastEdit.id);
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
    if (pb.authStore.isValid) {
      setEditing(true);
    } else {
      setShowGate(true);
    }
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
