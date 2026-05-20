import { useEffect, useState, useMemo } from "react";
import { useStagData } from "../lib/useStagData";
import { determineTripState, findTodayDayId, formatTMinus, slotStateMap } from "../lib/time";
import Header from "../components/Header";
import DayTabs from "../components/DayTabs";
import Day from "../components/Day";

export default function Stag({ slug }: { slug: string }) {
  const { bundle, error } = useStagData(slug);
  const [activeDayId, setActiveDayId] = useState<string>("");
  const [userPickedDay, setUserPickedDay] = useState(false);
  const [now, setNow] = useState(new Date());

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
      <Header stag={bundle.stag} tripBadge={badge} />
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
        />
      ))}
    </div>
  );
}
