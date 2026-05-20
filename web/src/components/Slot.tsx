import { useState } from "react";
import type { Slot as SlotType } from "../lib/types";
import EditSlotModal from "./EditSlotModal";
import { useLinkPreview, hostname } from "../lib/useLinkPreview";

interface Props {
  slot: SlotType;
  state?: "past" | "now" | "future";
  onSave?: (slotId: string, patch: Partial<SlotType>) => Promise<void>;
  onDelete?: (slotId: string) => Promise<void>;
  onMove?: (slotId: string, direction: "up" | "down") => Promise<void>;
}

export default function Slot({ slot, state = "future", onSave, onDelete, onMove }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  const primaryUrl = slot.map_url || slot.website_url;
  const { preview, loading } = useLinkPreview(primaryUrl);
  const showWebsitePill =
    !!slot.website_url && slot.website_url !== slot.map_url && slot.website_url !== primaryUrl;

  const classes = ["slot"];
  if (slot.is_featured) classes.push("featured");
  if (state === "now")  classes.push("is-now");
  if (state === "past") classes.push("is-past");
  if (primaryUrl)       classes.push("has-link");
  if (preview?.image)   classes.push("has-thumb");

  return (
    <div className={classes.join(" ")}>
      {primaryUrl && preview?.image && (
        <a
          className="slot-thumb"
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${slot.title}`}
          style={{ backgroundImage: `url(${preview.image})` }}
        />
      )}
      {primaryUrl && !preview?.image && loading && (
        <div className="slot-thumb slot-thumb-loading" aria-hidden="true" />
      )}

      <div className="slot-time">{slot.time_label}</div>

      {primaryUrl ? (
        <a
          className="slot-title slot-title-link"
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {slot.title}
          <span className="slot-title-arrow" aria-hidden="true">↗</span>
        </a>
      ) : (
        <div className="slot-title">{slot.title}</div>
      )}

      {slot.tags && slot.tags.length > 0 && (
        <div className="slot-tags">
          {slot.tags.map((t, i) => <span key={i} className={`tag tag-${t.kind}`}>{t.label}</span>)}
        </div>
      )}

      {slot.note && <p className="slot-note">{slot.note}</p>}

      {showWebsitePill && (
        <a
          className="slot-website-pill"
          href={slot.website_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {hostname(slot.website_url!)}
        </a>
      )}

      {onSave && (
        <div className="slot-edit-icons">
          <button onClick={() => setEditOpen(true)}>Edit</button>
          {onMove && <button onClick={() => onMove(slot.id, "up")}>↑</button>}
          {onMove && <button onClick={() => onMove(slot.id, "down")}>↓</button>}
          {onDelete && <button className="danger" onClick={() => {
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
