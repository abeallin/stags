import type { Day as DayType, Slot as SlotType } from "../lib/types";
import Slot from "./Slot";

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
  return (
    <section className={`day-section${active ? " active" : ""}`} data-day-id={day.id} style={{ position: "relative" }}>
      <div className="day-heading">
        <div className="day-date">
          {new Date(day.date + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h2 className="day-title">{day.title}</h2>
        {day.subtitle && <div className="day-meta">{day.subtitle}</div>}
        {onDeleteDay && (
          <button
            className="delete-day-btn"
            onClick={() => onDeleteDay(day.id)}
          >
            Delete day
          </button>
        )}
      </div>
      {slots.map(s => (
        <Slot
          key={s.id}
          slot={s}
          state={slotStates?.get(s.id) ?? "future"}
          onSave={onSlotSave}
          onDelete={onSlotDelete}
          onMove={onSlotMove}
        />
      ))}
      {onAddSlot && (
        <button className="add-slot" onClick={() => onAddSlot(day.id)}>
          + add slot
        </button>
      )}
    </section>
  );
}
