import type { Day as DayType } from "../lib/types";

interface Props {
  days: DayType[];
  activeDayId: string;
  onSelect: (dayId: string) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DayTabs({ days, activeDayId, onSelect }: Props) {
  return (
    <nav className="day-tabs">
      {days.map(d => {
        const dt = new Date(d.date);
        return (
          <button
            key={d.id}
            className={`tab${d.id === activeDayId ? " active" : ""}`}
            onClick={() => onSelect(d.id)}
          >
            {DAY_NAMES[dt.getDay()]}
            <span className="day-num">{dt.getDate()}</span>
          </button>
        );
      })}
    </nav>
  );
}
