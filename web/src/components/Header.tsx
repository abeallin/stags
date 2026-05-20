import type { Stag } from "../lib/types";

interface Props {
  stag: Stag;
  tripBadge?: string;
}

export default function Header({ stag, tripBadge }: Props) {
  return (
    <header className="header">
      <div className="header-eyebrow">{stag.eyebrow_text}</div>
      <h1>{stag.name}</h1>
      {tripBadge && <div className="trip-badge">{tripBadge}</div>}
      <div className="header-meta" dangerouslySetInnerHTML={{ __html: stag.header_meta_html }} />
    </header>
  );
}
