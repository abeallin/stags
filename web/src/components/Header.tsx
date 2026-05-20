import type { Stag } from "../lib/types";

interface Props {
  stag: Stag;
  tripBadge?: string;
  editing: boolean;
  onToggleEdit: () => void;
}

export default function Header({ stag, tripBadge, editing, onToggleEdit }: Props) {
  return (
    <header className="header">
      <button className={`edit-toggle${editing ? " active" : ""}`} onClick={onToggleEdit}>
        {editing ? "Done" : "Edit"}
      </button>
      <div className="header-eyebrow">{stag.eyebrow_text}</div>
      <h1>{stag.name}</h1>
      {tripBadge && <div className="trip-badge">{tripBadge}</div>}
      <div className="header-meta" dangerouslySetInnerHTML={{ __html: stag.header_meta_html }} />
    </header>
  );
}
