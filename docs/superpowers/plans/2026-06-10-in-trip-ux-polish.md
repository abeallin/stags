# In-trip UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four client-only in-trip refinements to the Stockholm itinerary tonight — tap-to-load maps, a sticky NOW bar, collapsed past events, and a dev `?now=` clock — without touching the backend or the existing aesthetic.

**Architecture:** Pure helper functions (testable) for clock override, collapse planning, and now-slot selection live in `web/src/lib`. UI changes are localized to `Slot.tsx` (maps), `Day.tsx` (collapse), a new `NowBar.tsx` component, and `Stag.tsx` (wiring + scroll). All styling appends to the existing `styles/stag.css`. No PocketBase collections or migrations.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest + Testing Library (jsdom), existing flyer CSS.

**Working directory:** All paths below are relative to `web/`. Run all `npm` commands from `C:/Users/Abel/Stags/web`.

**Spec:** `docs/superpowers/specs/2026-06-10-in-trip-ux-polish-design.md`

---

## File Structure

**Create:**
- `web/src/lib/todayView.ts` — pure helpers: `planCollapse()`, `findNowSlot()`
- `web/src/lib/devClock.ts` — pure helper: `getDevNowOverride()`
- `web/src/lib/useNowSlotVisibility.ts` — IntersectionObserver hook
- `web/src/components/NowBar.tsx` — sticky current-event bar
- `web/src/tests/todayView.test.ts` — unit tests for todayView helpers
- `web/src/tests/devClock.test.ts` — unit tests for the clock override
- `web/src/tests/Slot.test.tsx` — component tests for the map placeholder

**Modify:**
- `web/src/components/Slot.tsx` — tap-to-load map placeholder
- `web/src/components/Day.tsx` — collapse leading past events
- `web/src/pages/Stag.tsx` — `?now=` clock, `scrollToNow()`, NOW bar wiring
- `web/src/styles/stag.css` — append placeholder, NOW-bar, and past-toggle styles

---

## Task 1: `todayView` pure helpers

**Files:**
- Create: `web/src/lib/todayView.ts`
- Test: `web/src/tests/todayView.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/tests/todayView.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { planCollapse, findNowSlot } from "../lib/todayView";
import type { Slot } from "../lib/types";

function slot(id: string, order: number): Slot {
  return {
    id, day: "d1", start_time: "2026-06-12T10:00", time_label: id,
    title: id, note: "", tags: [], is_featured: false, sort_order: order,
  };
}

const a = slot("a", 0), b = slot("b", 1), c = slot("c", 2), d = slot("d", 3);

type S = Map<string, "past" | "now" | "future">;
const states = (entries: [Slot, "past" | "now" | "future"][]): S =>
  new Map(entries.map(([s, st]) => [s.id, st]));

describe("planCollapse", () => {
  it("returns nothing when there is no state map (non-today day)", () => {
    expect(planCollapse([a, b], undefined)).toEqual({ collapsedIds: [], allPast: false });
  });

  it("collapses the leading contiguous run of past slots", () => {
    const plan = planCollapse([a, b, c, d], states([[a, "past"], [b, "past"], [c, "now"], [d, "future"]]));
    expect(plan.collapsedIds).toEqual(["a", "b"]);
    expect(plan.allPast).toBe(false);
  });

  it("collapses nothing when the first slot is current", () => {
    const plan = planCollapse([a, b], states([[a, "now"], [b, "future"]]));
    expect(plan.collapsedIds).toEqual([]);
  });

  it("flags allPast when every slot is past", () => {
    const plan = planCollapse([a, b], states([[a, "past"], [b, "past"]]));
    expect(plan.collapsedIds).toEqual(["a", "b"]);
    expect(plan.allPast).toBe(true);
  });
});

describe("findNowSlot", () => {
  it("returns the slot marked now", () => {
    expect(findNowSlot([a, b, c], states([[a, "past"], [b, "now"], [c, "future"]]))?.id).toBe("b");
  });

  it("returns null when there is no now slot or no states", () => {
    expect(findNowSlot([a, b], states([[a, "past"], [b, "future"]]))).toBeNull();
    expect(findNowSlot([a, b], undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- todayView`
Expected: FAIL — `Failed to resolve import "../lib/todayView"`.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/todayView.ts`:

```ts
import type { Slot } from "./types";

type SlotState = "past" | "now" | "future";

export interface CollapsePlan {
  /** Leading contiguous run of past-state slot ids, in render order. */
  collapsedIds: string[];
  /** True when every slot in the day is past (end-of-day recap case). */
  allPast: boolean;
}

/**
 * Decide which leading past slots fold away on today's day. Past slots are
 * always contiguous from the top (the now slot, if any, separates past from
 * future), so we collect the leading run until we hit a non-past slot.
 */
export function planCollapse(
  slots: Slot[],
  states: Map<string, SlotState> | undefined,
): CollapsePlan {
  if (!states || states.size === 0) return { collapsedIds: [], allPast: false };
  const collapsedIds: string[] = [];
  for (const s of slots) {
    if (states.get(s.id) === "past") collapsedIds.push(s.id);
    else break;
  }
  const allPast = slots.length > 0 && collapsedIds.length === slots.length;
  return { collapsedIds, allPast };
}

/** The slot currently in the "now" state on today's day, or null. */
export function findNowSlot(
  slots: Slot[],
  states: Map<string, SlotState> | undefined,
): Slot | null {
  if (!states) return null;
  for (const s of slots) if (states.get(s.id) === "now") return s;
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- todayView`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/todayView.ts web/src/tests/todayView.test.ts
git commit -m "feat(sthlm): todayView helpers for collapse + now-slot selection"
```

---

## Task 2: `?now=` dev clock override

**Files:**
- Create: `web/src/lib/devClock.ts`
- Test: `web/src/tests/devClock.test.ts`
- Modify: `web/src/pages/Stag.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/tests/devClock.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getDevNowOverride } from "../lib/devClock";

describe("getDevNowOverride", () => {
  it("returns null in production regardless of query", () => {
    expect(getDevNowOverride("?now=2026-06-12T13:00", false)).toBeNull();
  });

  it("returns null when no now param is present", () => {
    expect(getDevNowOverride("?foo=bar", true)).toBeNull();
  });

  it("parses a valid ISO now param in dev", () => {
    const d = getDevNowOverride("?now=2026-06-12T13:00", true);
    expect(d).toBeInstanceOf(Date);
    expect(d?.getTime()).toBe(new Date("2026-06-12T13:00").getTime());
  });

  it("returns null for an unparseable now param", () => {
    expect(getDevNowOverride("?now=not-a-date", true)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- devClock`
Expected: FAIL — `Failed to resolve import "../lib/devClock"`.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/devClock.ts`:

```ts
/**
 * Dev-only clock override. When the app is built in dev mode and the URL has a
 * `?now=<ISO>` param, the app's `now` is seeded from it so trip-live UI states
 * (NOW bar, collapsed past events, auto-opened now-map) can be QA'd before the
 * trip actually starts. Inert in production builds.
 */
export function getDevNowOverride(search: string, isDev: boolean): Date | null {
  if (!isDev) return null;
  const raw = new URLSearchParams(search).get("now");
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(+d) ? null : d;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- devClock`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire the override into `Stag.tsx`**

In `web/src/pages/Stag.tsx`, add the import alongside the other `lib` imports near the top:

```ts
import { getDevNowOverride } from "../lib/devClock";
```

Also add `useRef` to the existing React import if not already present (it is — `useRef` is already imported on line 1).

Replace the existing `now` state and its ticking effect:

```ts
  const [now, setNow] = useState(new Date());
```
```ts
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
```

with:

```ts
  const devNowRef = useRef<Date | null>(getDevNowOverride(window.location.search, import.meta.env.DEV));
  const [now, setNow] = useState<Date>(() => devNowRef.current ?? new Date());

  useEffect(() => {
    if (devNowRef.current) return; // frozen clock under ?now= override
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
```

- [ ] **Step 6: Verify build + existing tests still pass**

Run: `npm run test`
Expected: PASS (all suites, including the two new ones).

Run: `npx tsc -b`
Expected: no type errors.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/devClock.ts web/src/tests/devClock.test.ts web/src/pages/Stag.tsx
git commit -m "feat(sthlm): dev-only ?now= clock override for QA of trip-live states"
```

---

## Task 3: Tap-to-load maps

**Files:**
- Modify: `web/src/components/Slot.tsx`
- Modify: `web/src/styles/stag.css`
- Test: `web/src/tests/Slot.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/tests/Slot.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Slot from "../components/Slot";
import type { Slot as SlotType } from "../lib/types";

function makeSlot(over: Partial<SlotType> = {}): SlotType {
  return {
    id: "s1", day: "d1", start_time: "2026-06-12T13:00",
    time_label: "1pm · lunch", title: "Kajsas Fisk", note: "",
    tags: [], is_featured: false, sort_order: 0,
    map_url: "https://maps.google.com/?q=Kajsas+Fisk", ...over,
  };
}

describe("Slot map placeholder", () => {
  it("renders a placeholder, not an iframe, for a future slot with a map", () => {
    render(<Slot slot={makeSlot()} state="future" />);
    expect(screen.queryByTitle("Map of Kajsas Fisk")).toBeNull();
    expect(screen.getByRole("button", { name: /load map of kajsas fisk/i })).toBeTruthy();
  });

  it("loads the iframe when the placeholder is tapped", () => {
    render(<Slot slot={makeSlot()} state="future" />);
    fireEvent.click(screen.getByRole("button", { name: /load map of kajsas fisk/i }));
    expect(screen.getByTitle("Map of Kajsas Fisk")).toBeTruthy();
  });

  it("deep-links 'Open in Maps' to the raw map_url", () => {
    render(<Slot slot={makeSlot()} state="future" />);
    const link = screen.getByRole("link", { name: /open in maps/i }) as HTMLAnchorElement;
    expect(link.href).toContain("maps.google.com");
    expect(link.getAttribute("href")).toBe("https://maps.google.com/?q=Kajsas+Fisk");
  });

  it("auto-opens the map for the current (now) slot", () => {
    render(<Slot slot={makeSlot()} state="now" />);
    expect(screen.getByTitle("Map of Kajsas Fisk")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- Slot`
Expected: FAIL — the current `Slot` always renders the iframe, so "renders a placeholder, not an iframe" fails (it finds the iframe by title).

- [ ] **Step 3: Implement the placeholder in `Slot.tsx`**

In `web/src/components/Slot.tsx`, add `useEffect` to the React import on line 1:

```ts
import { useState, useEffect, type CSSProperties } from "react";
```

Add map-open state inside the component, just after the existing `const [editOpen, setEditOpen] = useState(false);`:

```ts
  const [mapOpen, setMapOpen] = useState(state === "now");
  // If a later slot becomes "now" while on screen, auto-open its map.
  useEffect(() => {
    if (state === "now") setMapOpen(true);
  }, [state]);
```

Replace the existing map block:

```tsx
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
```

with:

```tsx
      {slot.map_url && (mapOpen ? (
        <div className="slot-map">
          <iframe
            src={toEmbedUrl(slot.map_url)}
            className="slot-map-iframe"
            loading="lazy"
            title={`Map of ${slot.title}`}
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div className="slot-map slot-map-placeholder">
          <button
            type="button"
            className="slot-map-load"
            onClick={() => setMapOpen(true)}
            aria-label={`Load map of ${slot.title}`}
          >
            <span className="slot-map-pin" aria-hidden="true">◉</span>
            <span className="slot-map-name">{slot.title}</span>
            <span className="slot-map-hint">Tap to load map</span>
          </button>
          <a
            className="slot-map-open"
            href={slot.map_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Maps ↗
          </a>
        </div>
      ))}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- Slot`
Expected: PASS (4 tests).

- [ ] **Step 5: Append placeholder styles to `stag.css`**

Append to the end of `web/src/styles/stag.css`:

```css
/* ─── MAP PLACEHOLDER (tap to load) ───────────────────────────────── */
.slot-map-placeholder {
  display: flex;
  flex-direction: column;
}
.slot-map-load {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  background: var(--bone);
  border: none;
  cursor: pointer;
  font-family: 'DM Mono', monospace;
  color: var(--ink);
}
.slot-map-pin { color: var(--accent); font-size: 22px; line-height: 1; }
.slot-map-name {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 10px;
  text-align: center;
}
.slot-map-hint {
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ash);
}
.slot-map-open {
  display: block;
  text-align: center;
  padding: 6px;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  background: var(--ink);
  color: var(--paper);
  text-decoration: none;
  border-top: 1.5px solid var(--ink);
}
.slot-map-open:hover { background: var(--accent); color: var(--ink); }
```

- [ ] **Step 6: Commit**

```bash
git add web/src/components/Slot.tsx web/src/tests/Slot.test.tsx web/src/styles/stag.css
git commit -m "feat(sthlm): tap-to-load maps with native deep link, now-slot auto-opens"
```

---

## Task 4: Collapse past events on today

**Files:**
- Modify: `web/src/components/Day.tsx`
- Modify: `web/src/styles/stag.css`

This task has no new pure logic (it reuses `planCollapse` from Task 1, already tested). Verification is via the build + manual QA in Task 6.

- [ ] **Step 1: Update `Day.tsx`**

In `web/src/components/Day.tsx`, replace the imports at the top:

```ts
import type { Day as DayType, Slot as SlotType } from "../lib/types";
import Slot from "./Slot";
```

with:

```ts
import { useState } from "react";
import type { Day as DayType, Slot as SlotType } from "../lib/types";
import Slot from "./Slot";
import { planCollapse } from "../lib/todayView";
```

Inside the `Day` component, just before the `return (`, add:

```ts
  const [pastExpanded, setPastExpanded] = useState(false);
  // Collapse only applies on today's active day (slotStates is non-empty only
  // for today) and only when NOT editing (handlers are passed in edit mode).
  const collapsible = active && !onSlotSave && !!slotStates && slotStates.size > 0;
  const plan = collapsible
    ? planCollapse(slots, slotStates)
    : { collapsedIds: [] as string[], allPast: false };
  const collapsedSet = new Set(plan.collapsedIds);
  const hidePast = collapsible && plan.collapsedIds.length > 0 && !pastExpanded;
```

Then replace the slot-rendering block:

```tsx
      {slots.map((s, i) => (
        <Slot
          key={s.id}
          slot={s}
          index={i}
          state={slotStates?.get(s.id) ?? "future"}
          onSave={onSlotSave}
          onDelete={onSlotDelete}
          onMove={onSlotMove}
        />
      ))}
```

with:

```tsx
      {collapsible && plan.collapsedIds.length > 0 && (
        <button
          className="past-toggle"
          onClick={() => setPastExpanded(v => !v)}
          aria-expanded={pastExpanded}
        >
          {pastExpanded
            ? "▴ hide earlier"
            : `▾ ${plan.collapsedIds.length} ${plan.allPast ? "— all done" : "earlier today"}`}
        </button>
      )}
      {slots.map((s, i) => {
        if (hidePast && collapsedSet.has(s.id)) return null;
        return (
          <Slot
            key={s.id}
            slot={s}
            index={i}
            state={slotStates?.get(s.id) ?? "future"}
            onSave={onSlotSave}
            onDelete={onSlotDelete}
            onMove={onSlotMove}
          />
        );
      })}
```

- [ ] **Step 2: Append past-toggle styles to `stag.css`**

Append to the end of `web/src/styles/stag.css`:

```css
/* ─── PAST-EVENTS COLLAPSE STRIP ──────────────────────────────────── */
.past-toggle {
  width: 100%;
  display: block;
  background: var(--bone);
  border: 1px dashed var(--ash-faint);
  color: var(--ash);
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 8px;
  margin: 0 0 12px;
  cursor: pointer;
}
.past-toggle:hover { color: var(--ink); border-color: var(--ink); }
```

- [ ] **Step 3: Verify build + tests**

Run: `npx tsc -b && npm run test`
Expected: no type errors; all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Day.tsx web/src/styles/stag.css
git commit -m "feat(sthlm): collapse leading past events on today's day"
```

---

## Task 5: Sticky NOW bar + jump-to-now

**Files:**
- Create: `web/src/lib/useNowSlotVisibility.ts`
- Create: `web/src/components/NowBar.tsx`
- Modify: `web/src/pages/Stag.tsx`
- Modify: `web/src/styles/stag.css`

The IntersectionObserver hook is not unit-tested (jsdom has no IntersectionObserver); it is verified manually in Task 6 via the `?now=` override.

- [ ] **Step 1: Create the visibility hook**

Create `web/src/lib/useNowSlotVisibility.ts`:

```ts
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
```

- [ ] **Step 2: Create the NowBar component**

Create `web/src/components/NowBar.tsx`:

```tsx
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
```

- [ ] **Step 3: Wire into `Stag.tsx` — imports**

In `web/src/pages/Stag.tsx`, add to the component imports near the top:

```ts
import NowBar from "../components/NowBar";
import { useNowSlotVisibility } from "../lib/useNowSlotVisibility";
import { findNowSlot } from "../lib/todayView";
```

- [ ] **Step 4: Wire into `Stag.tsx` — scrollToNow + refactor the one-shot effect**

Add a `scrollToNow` helper in the component body (place it just above the existing `// One-shot:` auto-scroll effect, around line 64):

```ts
  function scrollToNow() {
    const el = document.querySelector(".day-section.active .slot.is-now");
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }
```

Then refactor the existing one-shot effect body to reuse it. Replace:

```ts
    didAutoScrollRef.current = true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() =>
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }),
    );
```

with:

```ts
    didAutoScrollRef.current = true;
    requestAnimationFrame(() => scrollToNow());
```

- [ ] **Step 5: Wire into `Stag.tsx` — compute now-bar inputs before the early returns**

These must run before the `if (error)` / `if (!bundle)` early returns (line ~262) because hooks cannot run conditionally. Add immediately after the `slotStates` `useMemo` block (after line ~260, before the early returns):

```ts
  const todayId = findTodayDayId(bundle?.days ?? [], now);
  const nowSlotForBar =
    bundle && activeDayId === todayId
      ? findNowSlot(slotsByDay.get(activeDayId) ?? [], slotStates.get(activeDayId))
      : null;
  const nowVisible = useNowSlotVisibility(
    nowSlotForBar ? `${activeDayId}:${nowSlotForBar.id}` : null,
  );
```

This introduces `todayId` earlier than its current definition. Delete the now-duplicate line further down (currently around line 270):

```ts
  const todayId = findTodayDayId(bundle.days, now);
```

(The earlier `todayId` computed with `bundle?.days ?? []` produces the same value once `bundle` is loaded, and is safe before the guard.)

- [ ] **Step 6: Wire into `Stag.tsx` — render the bar**

Compute the visibility flag near the other render-time values (after `const state = determineTripState(...)`, around line 265):

```ts
  const showNowBar = state === "in" && !!nowSlotForBar && !nowVisible;
```

Render the bar directly after the `<DayTabs ... />` element in the returned JSX:

```tsx
      {showNowBar && nowSlotForBar && (
        <NowBar slot={nowSlotForBar} onJump={scrollToNow} />
      )}
```

- [ ] **Step 7: Append NOW-bar styles to `stag.css`**

Append to the end of `web/src/styles/stag.css`:

```css
/* ─── NOW BAR (sticky jump-to-current) ────────────────────────────── */
.now-bar {
  position: sticky;
  top: 44px; /* sits just under the sticky .day-tabs; tune if it overlaps */
  z-index: 9;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--accent);
  color: var(--ink);
  border: none;
  border-bottom: 2px solid var(--ink);
  cursor: pointer;
  text-align: left;
  font-family: 'DM Mono', monospace;
}
.now-bar-dot { font-size: 9px; animation: now-bar-blink 1.4s ease-in-out infinite; }
.now-bar-label { font-family: 'Bowlby One', Impact, sans-serif; font-size: 12px; letter-spacing: 1px; }
.now-bar-title {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 500;
}
.now-bar-time { font-size: 11px; opacity: 0.8; white-space: nowrap; }
.now-bar-jump { font-size: 14px; }
@keyframes now-bar-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.3; }
}
```

- [ ] **Step 8: Verify build + tests**

Run: `npx tsc -b && npm run test`
Expected: no type errors; all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add web/src/lib/useNowSlotVisibility.ts web/src/components/NowBar.tsx web/src/pages/Stag.tsx web/src/styles/stag.css
git commit -m "feat(sthlm): sticky NOW bar that jumps to the current event"
```

---

## Task 6: Manual QA + full verification

**Files:** none (verification only).

- [ ] **Step 1: Full automated check**

Run: `npx tsc -b && npm run test && npm run build`
Expected: type-check clean, all unit tests pass, production build succeeds.

- [ ] **Step 2: Start the app and PocketBase**

In one terminal: `cd C:/Users/Abel/Stags/pocketbase && ./pocketbase.exe serve`
In another: `cd C:/Users/Abel/Stags/web && npm run dev`

- [ ] **Step 3: Verify maps (no override needed)**

Open `http://localhost:5173/sthlm/`. Confirm:
- Each slot with a map shows the **MAP placeholder** (pin + name + "Tap to load map"), not a live map.
- Tapping the placeholder body loads the embedded map.
- "Open in Maps ↗" opens Google Maps in a new tab at the right place.

- [ ] **Step 4: Verify trip-live states via `?now=`**

Open `http://localhost:5173/sthlm/?now=2026-06-12T14:00` (Fri afternoon). Confirm:
- Today's day is auto-selected; the current event has the **NOW** stamp and its **map is auto-open**.
- Leading past events are folded into a `▾ N earlier today` strip; tapping expands/collapses them.
- Scroll down past the now event → the sticky **NOW bar** appears under the day tabs; tapping it scrolls back to the current event. Scroll the now event back into view → the bar disappears.
- Try `?now=2026-06-12T23:30` (late night) → the strip reads `▾ N — all done`.

- [ ] **Step 5: Verify edit mode is unaffected**

Still on a `?now=` URL, click Edit and enter the passphrase. Confirm:
- Past events are **not** collapsed (all slots visible and editable).
- Add/edit/move/delete slot and day controls still work.

- [ ] **Step 6: Capture a verification screenshot (optional, matches repo habit)**

Use the existing Playwright tooling or a manual screenshot of the `?now=` view for the record.

- [ ] **Step 7: Confirm no PocketBase migration files were created**

Run: `git status pocketbase/pb_migrations`
Expected: no new files (this work is client-only). If any appear, STOP — they must not exist for this feature.

---

## Self-Review Notes

- **Spec coverage:** maps (Task 3), single NOW bar merging jump+up-next (Task 5), collapse past (Task 4), `?now=` dev clock (Task 2), shared `scrollToNow`/visibility foundation (Tasks 1 & 5). All spec sections mapped.
- **No backend changes:** confirmed — Task 6 Step 7 explicitly guards against stray migrations.
- **Type consistency:** `planCollapse`/`findNowSlot` (Task 1) consumed unchanged in Tasks 4 & 5; `getDevNowOverride` (Task 2) matches its `Stag.tsx` call; `useNowSlotVisibility(key: string | null)` matches the Task 5 call site.
- **Editing preserved:** collapse is gated on `!onSlotSave` (Task 4); NOW bar/maps don't touch edit handlers.
