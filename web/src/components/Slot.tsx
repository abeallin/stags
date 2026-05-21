import { useState } from "react";
import type { Slot as SlotType } from "../lib/types";
import EditSlotModal from "./EditSlotModal";
import { hostname } from "../lib/useLinkPreview";
import { toEmbedUrl } from "../lib/mapEmbed";
import { confirm as confirmDialog } from "../lib/dialogs";

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
  const showWebsitePill =
    !!slot.website_url && slot.website_url !== slot.map_url && slot.website_url !== primaryUrl;

  const classes = ["slot"];
  if (slot.is_featured) classes.push("featured");
  if (state === "now")  classes.push("is-now");
  if (state === "past") classes.push("is-past");
  if (primaryUrl)       classes.push("has-link");

  return (
    <div className={classes.join(" ")}>
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

      {slot.map_url && (
        <div className="slot-map">
          <iframe
            src={toEmbedUrl(slot.map_url)}
            className="slot-map-iframe"
            loading="lazy"
            title={`Map of ${slot.title}`}
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

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
          {onDelete && <button className="danger" onClick={async () => {
            const ok = await confirmDialog({
              title: "Delete slot?",
              body: `"${slot.title}" will be removed. You can still undo this from the header bar.`,
              confirmLabel: "Delete",
              destructive: true,
            });
            if (ok) onDelete(slot.id);
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
