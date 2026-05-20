import type { Stag, Edit } from "../lib/types";

interface Props {
  stag: Stag;
  tripBadge?: string;
  editing: boolean;
  onToggleEdit: () => void;
  lastEdit?: Edit;
  onUndo?: () => void;
}

function describe(e: Edit): string {
  const t = (e.kind || "").split(".")[0];
  const v = (e.kind || "").split(".")[1];
  const target = (e.after as { title?: string })?.title ?? (e.before as { title?: string })?.title ?? "";
  return `${e.who} ${v}d ${t}${target ? ` "${target}"` : ""}`;
}

function ago(iso: string): string {
  const diffMs = Date.now() - +new Date(iso);
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function Header({ stag, tripBadge, editing, onToggleEdit, lastEdit, onUndo }: Props) {
  return (
    <header className="header">
      <button className={`edit-toggle${editing ? " active" : ""}`} onClick={onToggleEdit}>
        {editing ? "Done" : "Edit"}
      </button>
      <div className="header-eyebrow">{stag.eyebrow_text}</div>
      <h1>{stag.name}</h1>
      {tripBadge && <div className="trip-badge">{tripBadge}</div>}
      <div className="header-meta" dangerouslySetInnerHTML={{ __html: stag.header_meta_html }} />
      {lastEdit && (
        <div className="undo-bar">
          Last: {describe(lastEdit)} · {ago(lastEdit.created)}
          {onUndo && <button onClick={onUndo}>Undo</button>}
        </div>
      )}
    </header>
  );
}
