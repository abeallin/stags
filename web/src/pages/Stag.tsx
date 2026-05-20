import { useEffect, useState, useMemo } from "react";
import { useStagData } from "../lib/useStagData";
import Header from "../components/Header";
import DayTabs from "../components/DayTabs";
import Day from "../components/Day";

export default function Stag({ slug }: { slug: string }) {
  const { bundle, error } = useStagData(slug);
  const [activeDayId, setActiveDayId] = useState<string>("");

  useEffect(() => {
    if (bundle?.stag.accent_color) {
      document.documentElement.style.setProperty("--accent", bundle.stag.accent_color);
    }
    if (bundle && !activeDayId && bundle.days.length > 0) {
      setActiveDayId(bundle.days[0].id);
    }
  }, [bundle, activeDayId]);

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

  if (error)   return <div style={{ padding: 24 }}>Failed to load: {error}</div>;
  if (!bundle) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div className="container">
      <Header stag={bundle.stag} />
      <DayTabs days={bundle.days} activeDayId={activeDayId} onSelect={setActiveDayId} />
      {bundle.days.map(d => (
        <Day
          key={d.id}
          day={d}
          slots={slotsByDay.get(d.id) ?? []}
          active={d.id === activeDayId}
        />
      ))}
    </div>
  );
}
