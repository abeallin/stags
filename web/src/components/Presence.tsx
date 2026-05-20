import type { PresenceRow } from "../lib/types";

interface Props { viewers: PresenceRow[] }

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}

export default function Presence({ viewers }: Props) {
  if (viewers.length === 0) return null;
  return (
    <div className="presence-row" title={viewers.map(v => v.display_name).join(", ")}>
      {viewers.slice(0, 6).map(v => (
        <div key={v.id} className="presence-avatar" title={v.display_name}>{initials(v.display_name)}</div>
      ))}
      {viewers.length > 6 && <div className="presence-avatar">+{viewers.length - 6}</div>}
    </div>
  );
}
