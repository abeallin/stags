import type { Day as DayType, Slot as SlotType } from "../lib/types";
import Slot from "./Slot";

interface Props {
  day: DayType;
  slots: SlotType[];
  active: boolean;
  slotStates?: Map<string, "past" | "now" | "future">;
}

export default function Day({ day, slots, active, slotStates }: Props) {
  return (
    <section className={`day-section${active ? " active" : ""}`} data-day-id={day.id}>
      <div className="day-heading">
        <div className="day-date">
          {new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h2 className="day-title">{day.title}</h2>
        {day.subtitle && <div className="day-meta">{day.subtitle}</div>}
      </div>
      {slots.map(s => (
        <Slot key={s.id} slot={s} state={slotStates?.get(s.id) ?? "future"} />
      ))}
    </section>
  );
}
