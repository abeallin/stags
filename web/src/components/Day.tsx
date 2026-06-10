import { useState } from "react";
import type { Day as DayType, Slot as SlotType } from "../lib/types";
import Slot from "./Slot";
import { planCollapse } from "../lib/todayView";

interface Props {
  day: DayType;
  slots: SlotType[];
  active: boolean;
  slotStates?: Map<string, "past" | "now" | "future">;
  onSlotSave?:   (slotId: string, patch: Partial<SlotType>) => Promise<void>;
  onSlotDelete?: (slotId: string) => Promise<void>;
  onSlotMove?:   (slotId: string, direction: "up" | "down") => Promise<void>;
  onAddSlot?:    (dayId: string) => Promise<void>;
  onDeleteDay?:  (dayId: string) => Promise<void>;
}

export default function Day({ day, slots, active, slotStates, onSlotSave, onSlotDelete, onSlotMove, onAddSlot, onDeleteDay }: Props) {
  const [pastExpanded, setPastExpanded] = useState(false);
  // Collapse only applies on today's active day (slotStates is non-empty only
  // for today) and only when NOT editing (handlers are passed in edit mode).
  const collapsible = active && !onSlotSave && !!slotStates && slotStates.size > 0;
  const plan = collapsible
    ? planCollapse(slots, slotStates)
    : { collapsedIds: [] as string[], allPast: false };
  const collapsedSet = new Set(plan.collapsedIds);
  const hidePast = collapsible && plan.collapsedIds.length > 0 && !pastExpanded;

  return (
    <section className={`day-section${active ? " active" : ""}`} data-day-id={day.id} style={{ position: "relative" }}>
      <div className="day-heading">
        <div className="day-date">
          {new Date(day.date + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h2 className="day-title">{day.title}</h2>
        {day.subtitle && <div className="day-meta">{day.subtitle}</div>}
      </div>
      {collapsible && plan.collapsedIds.length > 0 && (
        <button
          className="past-toggle"
          onClick={() => setPastExpanded(v => !v)}
          aria-expanded={pastExpanded}
        >
          {pastExpanded
            ? "▴ hide earlier"
            : `▾ ${plan.collapsedIds.length} ${plan.allPast ? "— all done" : "earlier today"}`}
        </button>
      )}
      {slots.map((s, i) => {
        if (hidePast && collapsedSet.has(s.id)) return null;
        return (
          <Slot
            key={s.id}
            slot={s}
            index={i}
            state={slotStates?.get(s.id) ?? "future"}
            onSave={onSlotSave}
            onDelete={onSlotDelete}
            onMove={onSlotMove}
          />
        );
      })}
      {onAddSlot && (
        <button className="add-slot" onClick={() => onAddSlot(day.id)}>
          + add slot
        </button>
      )}
      {onDeleteDay && (
        <button className="delete-day-btn" onClick={() => onDeleteDay(day.id)}>
          Delete this day
        </button>
      )}
    </section>
  );
}
