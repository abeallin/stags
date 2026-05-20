import { useEffect } from "react";
import { useStagData } from "../lib/useStagData";

export default function Stag({ slug }: { slug: string }) {
  const { bundle, error } = useStagData(slug);

  useEffect(() => {
    if (bundle?.stag.accent_color) {
      document.documentElement.style.setProperty("--accent", bundle.stag.accent_color);
    }
  }, [bundle]);

  if (error)  return <div style={{ padding: 24 }}>Failed to load: {error}</div>;
  if (!bundle) return <div style={{ padding: 24 }}>Loading…</div>;

  const { stag, days, slots } = bundle;
  const slotsByDay = new Map<string, typeof slots>();
  for (const s of slots) {
    const list = slotsByDay.get(s.day) ?? [];
    list.push(s);
    slotsByDay.set(s.day, list);
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-eyebrow">{stag.eyebrow_text}</div>
        <h1>{stag.name}</h1>
        <div className="header-meta" dangerouslySetInnerHTML={{ __html: stag.header_meta_html }} />
      </header>
      {days.map(d => (
        <section key={d.id} className="day-section active">
          <div className="day-heading">
            <div className="day-date">{new Date(d.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
            <h2 className="day-title">{d.title}</h2>
          </div>
          {(slotsByDay.get(d.id) ?? []).map(s => (
            <div key={s.id} className={`slot${s.is_featured ? " featured" : ""}`}>
              <div className="slot-time">{s.time_label}</div>
              <div className="slot-title">{s.title}</div>
              <div className="slot-tags">
                {s.tags?.map((t, i) => <span key={i} className={`tag tag-${t.kind}`}>{t.label}</span>)}
              </div>
              <p className="slot-note">{s.note}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
