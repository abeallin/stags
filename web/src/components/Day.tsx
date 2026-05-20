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
          {new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h2 className="day-title">{day.title}</h2>
        {day.subtitle && <div className="day-meta">{day.subtitle}</div>}
        {onDeleteDay && (
          <button
            onClick={() => onDeleteDay(day.id)}
            style={{ position: "absolute", top: 8, right: 8, fontSize: 11, padding: "4px 8px", border: "1px solid var(--line-strong)", background: "transparent", borderRadius: 4, cursor: "pointer", color: "var(--ink-soft)" }}
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
        <button
          className="slot"
          style={{ width: "100%", border: "1px dashed var(--line-strong)", background: "transparent", cursor: "pointer", padding: 16, color: "var(--ink-faint)" }}
          onClick={() => onAddSlot(day.id)}
        >
          + add slot
        </button>
      )}
    </section>
  );
}
