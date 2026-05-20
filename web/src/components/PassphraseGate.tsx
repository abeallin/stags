import { useState } from "react";
import { pb } from "../lib/pb";

interface Props {
  slug: string;
  onAuthed: (displayName: string) => void;
  onCancel: () => void;
}

const DISPLAY_NAME_KEY = "stags.displayName";

export default function PassphraseGate({ slug, onAuthed, onCancel }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [displayName, setDisplayName] = useState(localStorage.getItem(DISPLAY_NAME_KEY) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await pb.collection("users").authWithPassword(
        `${slug}-editor@stags.local`,
        passphrase,
      );
      localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim());
      onAuthed(displayName.trim());
    } catch (_e) {
      setError("Wrong passphrase, try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Unlock editing</h3>
        <form onSubmit={handleSubmit}>
          <label>Your name (lads see this on edits)</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            autoFocus
          />
          <label>Passphrase</label>
          <input
            type="password"
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
            required
          />
          {error && <div style={{ color: "#b53824", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="primary" disabled={busy || !passphrase || !displayName.trim()}>
              {busy ? "…" : "Unlock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
