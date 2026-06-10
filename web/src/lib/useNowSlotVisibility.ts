import { useEffect, useState } from "react";

/**
 * Reports whether the active day's "now" slot is on screen. `key` must change
 * whenever the now-slot might change (active day or now-slot id), so the
 * observer rebinds to the right element. When `key` is null (no now-slot to
 * track), this reports `true` so callers hide the NOW bar.
 */
export function useNowSlotVisibility(key: string | null): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!key) { setVisible(true); return; }
    const el = document.querySelector(".day-section.active .slot.is-now");
    if (!el) { setVisible(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [key]);

  return visible;
}
