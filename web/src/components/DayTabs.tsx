import type { Day as DayType } from "../lib/types";

interface Props {
  days: DayType[];
  activeDayId: string;
  todayDayId?: string | null;
  onSelect: (dayId: string) => void;
  onAddDay?: () => Promise<void>;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DayTabs({ days, activeDayId, todayDayId, onSelect, onAddDay }: Props) {
  return (
    <nav className="day-tabs">
      {days.map(d => {
        const dt = new Date(d.date + "T12:00");
        const cls =
          `tab${d.id === activeDayId ? " active" : ""}${d.id === todayDayId ? " is-today" : ""}`;
        return (
          <button
            key={d.id}
            className={cls}
            onClick={() => onSelect(d.id)}
            aria-current={d.id === todayDayId ? "date" : undefined}
          >
            {DAY_NAMES[dt.getDay()]}
            <span className="day-num">{dt.getDate()}</span>
          </button>
        );
      })}
      {onAddDay && (
        <button className="tab" onClick={onAddDay} title="Add day">+</button>
      )}
    </nav>
  );
}
