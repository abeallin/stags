import { useState } from "react";
import type { Slot, Tag, TagKind } from "../lib/types";

interface Props {
  slot: Slot;
  onSave: (patch: Partial<Slot>) => Promise<void>;
  onClose: () => void;
}

const TAG_KINDS: TagKind[] = ["walk", "metro", "train", "taxi", "must", "book", "info"];

export default function EditSlotModal({ slot, onSave, onClose }: Props) {
  const [startTime, setStartTime] = useState(slot.start_time.slice(0, 16));
  const [timeLabel, setTimeLabel] = useState(slot.time_label);
  const [title, setTitle]         = useState(slot.title);
  const [note, setNote]           = useState(slot.note);
  const [isFeatured, setFeatured] = useState(slot.is_featured);
  const [tagsRaw, setTagsRaw]     = useState(JSON.stringify(slot.tags ?? [], null, 2));
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    let parsedTags: Tag[];
    try {
      parsedTags = JSON.parse(tagsRaw);
      if (!Array.isArray(parsedTags)) throw new Error("not array");
      for (const t of parsedTags) {
        if (typeof t.label !== "string" || !TAG_KINDS.includes(t.kind)) {
          throw new Error("invalid tag");
        }
      }
    } catch {
      setError("Tags must be JSON array of {label,kind}.");
      setBusy(false);
      return;
    }
    try {
      await onSave({
        start_time:  startTime,
        time_label:  timeLabel,
        title,
        note,
        is_featured: isFeatured,
        tags:        parsedTags,
      });
      onClose();
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Edit slot</h3>
        <form onSubmit={handleSubmit}>
          <label>Start time</label>
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required />

          <label>Time label (display string)</label>
          <input value={timeLabel} onChange={e => setTimeLabel(e.target.value)} required />

          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required />

          <label>Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} />

          <label>Tags (JSON)</label>
          <textarea value={tagsRaw} onChange={e => setTagsRaw(e.target.value)} style={{ fontFamily: "monospace", fontSize: 12 }} />

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={isFeatured} onChange={e => setFeatured(e.target.checked)} />
            Featured
          </label>

          {error && <div style={{ color: "#b53824", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary" disabled={busy}>{busy ? "…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
