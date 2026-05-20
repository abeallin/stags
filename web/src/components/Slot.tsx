import type { Slot as SlotType } from "../lib/types";

interface Props {
  slot: SlotType;
  state?: "past" | "now" | "future";
}

export default function Slot({ slot, state = "future" }: Props) {
  const classes = ["slot"];
  if (slot.is_featured) classes.push("featured");
  if (state === "now")  classes.push("is-now");
  if (state === "past") classes.push("is-past");

  return (
    <div className={classes.join(" ")}>
      <div className="slot-time">{slot.time_label}</div>
      <div className="slot-title">{slot.title}</div>
      {slot.tags && slot.tags.length > 0 && (
        <div className="slot-tags">
          {slot.tags.map((t, i) => <span key={i} className={`tag tag-${t.kind}`}>{t.label}</span>)}
        </div>
      )}
      {slot.note && <p className="slot-note">{slot.note}</p>}
    </div>
  );
}
