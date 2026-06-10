# In-trip UX polish — design

**Date:** 2026-06-10
**Status:** Approved (design), pending spec review
**Context:** Stockholm stag trip runs 11–14 June 2026. This work ships the night before so the lads use it live, on phones, likely on roaming data.

## Goal

Refine the existing club-flyer itinerary for in-trip mobile use. Keep the aesthetic; improve flow and reduce data weight. No new visual direction, no new features beyond the four below. Expense splitting ("Splitwise") is explicitly **out of scope** here and will get its own spec after the trip.

## Constraints

- **No backend changes.** Client-side React + CSS only. No new PocketBase collections, no migrations, no schema edits.
- **Moderate risk tolerance.** Layout changes are allowed but must be tested (incl. trip-live states) before push.
- Preserve everything already working: sticky day tabs, auto-select today, one-shot auto-scroll to the now event, past/now/future slot states, trip progress bar, presence, T-minus countdown.
- Editing mode must remain fully functional (add/edit/move/delete slots and days).

## Scope — four changes

### Shared foundation

Small reusable pieces, added in `web/src/pages/Stag.tsx` (or a colocated helper/hook under `web/src/lib`):

1. **`scrollToNow()`** — a single helper that scrolls `.day-section.active .slot.is-now` into view (`block: "center"`, honoring `prefers-reduced-motion`). The existing one-shot auto-scroll effect, and the new NOW bar, both call this. Refactor the existing effect to use it (no behavior change to the one-shot).
2. **`useNowSlotVisibility()`** — an `IntersectionObserver` watching the active day's `.slot.is-now` element; returns whether the now-slot is currently on-screen. Re-binds when the active day or the now-slot changes. Returns "not applicable" when there is no now-slot.
3. **`?now=<ISO>` dev override** — when `import.meta.env.DEV` is true and a `now` query param is present and parseable, seed the `now` state from it instead of `new Date()` (the interval tick can be paused or continue from the seeded value — seeded value is sufficient for QA). Ignored entirely in production builds. Purpose: QA the trip-live states (today is the 10th = "pre" state) before the trip starts.

### 1. Tap-to-load maps · `web/src/components/Slot.tsx` + `styles/stag.css`

**Status: live immediately (not trip-gated).**

- When a slot has `map_url`, render a **brutalist MAP placeholder** instead of an always-mounted `<iframe>`:
  - Ink-bordered tile consistent with the existing card style, an accent map-pin glyph, the destination/slot name, and a `Tap to load · Open in Maps ↗` affordance.
  - Tapping the tile body mounts the real iframe (existing `toEmbedUrl(slot.map_url)` + current iframe attributes) in place.
  - The `Open in Maps ↗` link deep-links to the **raw `map_url`** (`target="_blank"`, `rel="noopener noreferrer"`) so users can open the native Maps app and skip the embed entirely.
- **The current ("now") slot auto-opens its map** (mounts the iframe without a tap), preserving the "see where we are" feel. Every other slot stays collapsed until tapped.
- Past slots continue to hide their maps (existing `.slot.is-past .slot-map` behavior).
- State: a per-slot `mapOpen` boolean in `Slot.tsx`, initialized `true` when `state === "now"`, else `false`.
- Win: a 4-stop day drops from ~4 live Google Maps iframes to 0–1.

### 2 + 4. Single NOW bar · new component + `Stag.tsx` + CSS

**Status: trip-gated (only while trip state is "in").**

Merges the requested "jump-to-now button" and "up-next bar" into one control (two separate controls would both just jump to the current event — redundant furniture).

- A compact **sticky NOW bar** pinned directly under the sticky day tabs.
- **Visible only when all are true:** trip state is `"in"`, the active day is today, a now-slot exists, and the now-slot is **off-screen** (per `useNowSlotVisibility`).
- Content: `● NOW · {title} · {time_label}` of the current slot, styled in the flyer idiom (ink bar, accent dot/marker). Truncate long titles.
- Tapping the bar calls `scrollToNow()` (smooth-scroll the now event to center).
- When the now-slot is on-screen, the bar is hidden (no clutter while you're looking at it).

### 3. Collapse past events · `web/src/components/Day.tsx` + CSS

**Status: trip-gated.**

- Applies **only** to the active day when it is today, **and only when not editing**.
- Leading past slots (contiguous `"past"` state from the top) fold into a thin strip: `▾ N earlier today`. Default **collapsed**. Tapping expands/collapses.
- The now slot and future slots render normally below the strip.
- **Edit mode:** always fully expanded (past slots must stay editable/reorderable). The collapse UI does not render while editing.
- **Whole-day-done edge:** if every slot on today is `"past"` (end of day), show a `▾ all done` strip; expanding reveals the day's recap.
- Determining which slots collapse is a small pure predicate over the `slotStates` map + slot order — unit-testable.

## Data flow

- `now` clock lives in `Stag.tsx` (seeded from `?now=` in DEV, else `new Date()`, ticking every 30s as today).
- `slotStates` (past/now/future) already computed per day for today only — reused as-is to decide map auto-open, NOW-bar content, and which slots collapse.
- `useNowSlotVisibility` reads the DOM element rendered for the now-slot; gated so it only observes when a now-slot exists on the active day.
- No new persisted state. The map-open and collapse states are ephemeral UI state, reset on reload (acceptable).

## Error / edge handling

- No now-slot (before the day's first event, or non-today day): NOW bar hidden; no maps auto-open; nothing collapses.
- Reduced motion: `scrollToNow()` uses `behavior: "auto"`.
- Iframe load failure: unchanged from today (the `Open in Maps ↗` link is an independent fallback).
- Production build: `?now=` override is compiled out / inert.

## Testing

- **Maps placeholder:** testable today with no override (not trip-gated). Verify placeholder renders, tap mounts iframe, deep link points at raw `map_url`, now-slot map is auto-open.
- **Trip-live features:** use `?now=2026-06-12T13:00` (and similar) in dev to drive the NOW bar, collapse, and now-map auto-open. Confirm: bar appears when now-slot scrolled off and jumps on tap; past slots collapse and expand; edit mode disables collapse.
- **Unit:** add a test for the "which slots collapse" predicate next to `web/src/tests/time.test.ts`.
- **Regression:** existing Vitest + Playwright suites must still pass; sticky tabs, auto-select today, one-shot scroll, and editing flows unchanged.

## Out of scope

- Expense splitting / Splitwise (separate later spec — requires a participant roster + new PocketBase collections).
- Any new visual direction or theme change.
- Touch-target / spacing polish beyond what these four changes naturally touch.
- Offline/PWA caching improvements.
