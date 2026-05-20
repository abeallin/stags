import { useState } from "react";
import type { Slot as SlotType } from "../lib/types";
import EditSlotModal from "./EditSlotModal";

interface Props {
  slot: SlotType;
  state?: "past" | "now" | "future";
  onSave?: (slotId: string, patch: Partial<SlotType>) => Promise<void>;
  onDelete?: (slotId: string) => Promise<void>;
  onMove?: (slotId: string, direction: "up" | "down") => Promise<void>;
}

export default function Slot({ slot, state = "future", onSave, onDelete, onMove }: Props) {
  const [editOpen, setEditOpen] = useState(false);
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
      {onSave && (
        <div className="slot-edit-icons">
          <button onClick={() => setEditOpen(true)}>Edit</button>
          {onMove && <button onClick={() => onMove(slot.id, "up")}>↑</button>}
          {onMove && <button onClick={() => onMove(slot.id, "down")}>↓</button>}
          {onDelete && <button onClick={() => {
            if (confirm(`Delete "${slot.title}"?`)) onDelete(slot.id);
          }}>Delete</button>}
        </div>
      )}
      {editOpen && onSave && (
        <EditSlotModal
          slot={slot}
          onSave={(patch) => onSave(slot.id, patch)}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
