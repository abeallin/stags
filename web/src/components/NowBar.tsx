import type { Slot } from "../lib/types";

interface Props {
  slot: Slot;
  onJump: () => void;
}

export default function NowBar({ slot, onJump }: Props) {
  return (
    <button className="now-bar" onClick={onJump} aria-label={`Jump to now: ${slot.title}`}>
      <span className="now-bar-dot" aria-hidden="true">●</span>
      <span className="now-bar-label">NOW</span>
      <span className="now-bar-title">{slot.title}</span>
      <span className="now-bar-time">{slot.time_label}</span>
      <span className="now-bar-jump" aria-hidden="true">↓</span>
    </button>
  );
}
