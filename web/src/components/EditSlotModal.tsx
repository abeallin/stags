import { useState } from "react";
import type { Slot, Tag, TagKind } from "../lib/types";

interface Props {
  slot: Slot;
  onSave: (patch: Partial<Slot>) => Promise<void>;
  onClose: () => void;
}

const TAG_KINDS: TagKind[] = ["walk", "metro", "train", "taxi", "must", "book", "info"];
const KIND_LABEL: Record<TagKind, string> = {
  walk:  "Walk",
  metro: "Metro",
  train: "Train",
  taxi:  "Taxi",
  must:  "Must",
  book:  "Book",
  info:  "Info",
};

function splitDateTime(iso: string): { date: string; time: string } {
  // iso may be "YYYY-MM-DDTHH:mm[:ss[.sss]][Z]" — slice defensively
  const [d, t = ""] = iso.split("T");
  return { date: d, time: t.slice(0, 5) };
}

export default function EditSlotModal({ slot, onSave, onClose }: Props) {
  const initial = splitDateTime(slot.start_time);

  const [date, setDate]             = useState(initial.date);
  const [time, setTime]             = useState(initial.time);
  const [timeLabel, setTimeLabel]   = useState(slot.time_label);
  const [title, setTitle]           = useState(slot.title);
  const [note, setNote]             = useState(slot.note);
  const [tags, setTags]             = useState<Tag[]>(slot.tags ?? []);
  const [mapUrl, setMapUrl]         = useState(slot.map_url ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(slot.website_url ?? "");
  const [isFeatured, setFeatured]   = useState(slot.is_featured);

  const [newTagKind, setNewTagKind]   = useState<TagKind>("info");
  const [newTagLabel, setNewTagLabel] = useState("");

  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag() {
    const label = newTagLabel.trim();
    if (!label) return;
    setTags(prev => [...prev, { label, kind: newTagKind }]);
    setNewTagLabel("");
  }

  function removeTag(idx: number) {
    setTags(prev => prev.filter((_, i) => i !== idx));
  }

  function handleAddKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await onSave({
        start_time:  `${date}T${time}`,
        time_label:  timeLabel,
        title,
        note,
        is_featured: isFeatured,
        tags,
        map_url:     mapUrl.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
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
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">// EDIT SLOT</div>
            <h3>{title || "Untitled"}</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="field-row">
              <div>
                <label htmlFor="slot-date">Date</label>
                <input
                  id="slot-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="slot-time">Time</label>
                <input
                  id="slot-time"
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <label htmlFor="slot-time-label">
              Time label
              <span className="field-label-hint">how it appears on the card</span>
            </label>
            <input
              id="slot-time-label"
              type="text"
              value={timeLabel}
              onChange={e => setTimeLabel(e.target.value)}
              placeholder="e.g. 7:30pm · cocktails"
              required
            />

            <label htmlFor="slot-title">Title</label>
            <input
              id="slot-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />

            <label>Tags</label>
            <div className="tag-editor-list">
              {tags.map((t, i) => (
                <span key={i} className={`tag-chip kind-${t.kind}`}>
                  {t.label}
                  <button
                    type="button"
                    className="tag-chip-remove"
                    onClick={() => removeTag(i)}
                    aria-label={`Remove ${t.label}`}
                  >×</button>
                </span>
              ))}
            </div>
            <div className="tag-editor-add">
              <select
                value={newTagKind}
                onChange={e => setNewTagKind(e.target.value as TagKind)}
                aria-label="Tag kind"
              >
                {TAG_KINDS.map(k => (
                  <option key={k} value={k}>{KIND_LABEL[k]}</option>
                ))}
              </select>
              <input
                type="text"
                value={newTagLabel}
                onChange={e => setNewTagLabel(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="label…"
                aria-label="Tag label"
              />
              <button type="button" onClick={addTag} disabled={!newTagLabel.trim()}>
                Add
              </button>
            </div>

            <label htmlFor="slot-note">Note</label>
            <textarea
              id="slot-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Anything the lads need to know…"
            />

            <label htmlFor="slot-map">
              Map URL
              <span className="field-label-hint">optional</span>
            </label>
            <input
              id="slot-map"
              type="url"
              value={mapUrl}
              onChange={e => setMapUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/…"
            />

            <label htmlFor="slot-web">
              Website URL
              <span className="field-label-hint">optional</span>
            </label>
            <input
              id="slot-web"
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://…"
            />

            <label className="check-row">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={e => setFeatured(e.target.checked)}
              />
              <div>
                <div className="check-label-text">Headline slot</div>
                <div className="check-sub-text">Bigger card with a magenta shadow</div>
              </div>
            </label>

            {error && <div className="form-error">{error}</div>}
          </div>

          <div className="modal-foot">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
