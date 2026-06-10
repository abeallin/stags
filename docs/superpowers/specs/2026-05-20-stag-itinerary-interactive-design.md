# Interactive Stag Itinerary — Design

**Date**: 2026-05-20
**Status**: Approved, ready for implementation plan
**Scope**: Convert two static itinerary HTMLs (Barcelona 3–7 June 2026, Stockholm 11–14 June 2026) into a small interactive web app with time-aware presentation, shared editing, and a passphrase-gated trust model.

---

## Goal

Two stag groups need to view and collaboratively edit their trip plan from their phones. The current artefacts are beautifully designed self-contained HTML files but are read-only and not aware of "now". Members should land on the site and see what's happening *right now* without having to scroll, and any lad (with the shared passphrase) should be able to tweak the schedule from the browser with everyone else seeing the change live.

## Success criteria

A lad opening the URL on the morning of day 2 sees day 2's tab pre-selected and the current breakfast slot highlighted. Tapping "Edit", entering the shared passphrase, and changing "10am brunch" to "11am brunch" updates every other open browser within ~1 second. The organizer can edit the schedule from the PocketBase admin UI without touching code or git.

## Non-goals

- User accounts / per-user identity (one shared editor account per stag is enough)
- Conflict resolution beyond last-write-wins (10 lads with a passphrase, this is sufficient)
- Mobile native apps (PWA via manifest is enough for "Add to Home Screen")
- Multi-language support
- Analytics
- Public discoverability — sharing is via direct link

## Architecture

### Stack

| Piece | Choice | Rationale |
|---|---|---|
| Frontend | React + TypeScript + Vite | State-driven editing, types catch slot-shape bugs, Vite gives a fast dev loop and GitHub Pages-ready build |
| Backend | **PocketBase** on Railway | Single binary that provides DB + REST API + WebSocket realtime + admin UI + auth. Zero handwritten backend code. |
| Database | SQLite (PocketBase built-in) | Plenty for ~50 records per stag |
| Realtime | PocketBase WebSocket subscriptions | Native to PocketBase, ~5 lines of client code |
| Auth | PocketBase users; one editor user per stag, passphrase as password | Reuses built-in auth without per-lad accounts |
| Host (web) | GitHub Pages | Free, simple, matches the "send a link" sharing model |
| Host (api) | Railway | User has Railway already provisioned |

### Repo layout

```
stags/
├─ web/                                  ← React + Vite frontend
│  ├─ src/
│  │  ├─ pages/Stag.tsx                  ← per-stag view, route param decides BCN vs STHLM
│  │  ├─ components/
│  │  │  ├─ Header.tsx                   ← title, T-minus badge, presence row, undo
│  │  │  ├─ DayTabs.tsx                  ← horizontal day selector
│  │  │  ├─ Day.tsx                      ← day-section wrapper
│  │  │  ├─ Slot.tsx                     ← single slot, handles is-now / is-past states
│  │  │  ├─ EditSlotModal.tsx
│  │  │  ├─ AddSlotButton.tsx
│  │  │  ├─ Presence.tsx                 ← avatar row
│  │  │  └─ PassphraseGate.tsx
│  │  ├─ lib/
│  │  │  ├─ pb.ts                        ← PocketBase client singleton
│  │  │  ├─ time.ts                      ← determineTripState, findCurrentSlot, T-minus
│  │  │  └─ types.ts                     ← Stag, Day, Slot, Edit, Presence
│  │  ├─ styles/stag.css                 ← existing CSS lifted verbatim
│  │  └─ main.tsx, App.tsx, router setup
│  ├─ public/manifest.webmanifest
│  ├─ index.html
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ vite.config.ts
├─ pocketbase/
│  ├─ Dockerfile                         ← Railway build target
│  ├─ pb_migrations/
│  │  ├─ 0001_init_collections.js
│  │  └─ 0002_seed_from_html.js          ← parses the two source HTMLs once, then no-ops
│  └─ source-html/                       ← snapshot copies of bcn-stag-2026.html, sthlm-stag-2026.html for seeding
├─ .github/workflows/deploy-web.yml
└─ README.md
```

Single repo, two top-level folders. No monorepo tooling (workspaces overkill for this size). `web` and `pocketbase` are deployed independently.

### PocketBase schema

#### `stags`
| Field | Type | Notes |
|---|---|---|
| `id` | text | PocketBase default |
| `slug` | text, unique | `bcn`, `sthlm` |
| `name` | text | "Barcelona 2026" |
| `start_date` | date | First day of trip |
| `end_date` | date | Last day of trip |
| `accent_color` | text | e.g. `#c84a2c` for BCN |
| `eyebrow_text` | text | Header sub-line |
| `header_meta_html` | text | The little "5 lads building to 8" prose |

#### `days`
| Field | Type | Notes |
|---|---|---|
| `id` | text | |
| `stag` | relation → stags | |
| `date` | date | e.g. `2026-06-03` |
| `title` | text | "The arrival" |
| `subtitle` | text | "" or descriptive |
| `sort_order` | number | Within a stag |

#### `slots`
| Field | Type | Notes |
|---|---|---|
| `id` | text | |
| `day` | relation → days | |
| `start_time` | date | **Used for time-aware highlighting**. Stored as full ISO datetime in destination local time, interpreted client-side as device local (per design decision). |
| `time_label` | text | Display string: `"7:30pm · Swedish classics"` |
| `title` | text | `"Lilla Gästabud"` |
| `note` | text | The slot body paragraph(s); supports basic markdown (`**bold**`, paragraph breaks) |
| `tags` | json | Array of `{label, kind}` — `kind` ∈ `walk`/`must`/`metro`/etc. for CSS class |
| `is_featured` | bool | The `.slot.featured` accent variant |
| `sort_order` | number | Within a day |

#### `edits`
| Field | Type | Notes |
|---|---|---|
| `id` | text | |
| `stag` | relation → stags | Scopes "recent edits" queries |
| `kind` | text | `slot.update`, `slot.create`, `slot.delete`, `slot.reorder`, `day.update`, `day.create`, `day.delete` |
| `target_id` | text | The slots.id or days.id affected |
| `before` | json | Snapshot before change (null for create) |
| `after` | json | Snapshot after change (null for delete) |
| `who` | text | Free-text display name entered by the editor on first edit, stored in localStorage |
| `created_at` | autodate | PocketBase default |

#### `presence`
| Field | Type | Notes |
|---|---|---|
| `id` | text | |
| `stag` | relation → stags | |
| `session_id` | text | Random per-tab UUID |
| `display_name` | text | Same as `who` from edits |
| `last_seen` | autodate | Updated on heartbeat |

Heartbeat every 20s from the client. Server-side: a viewer is "active" if `last_seen` is within 60s. Stale rows can be cleaned by a periodic PocketBase cron hook or a simple "on read, filter by last_seen > now-60s" query (we'll go with the latter — simpler, the table stays small).

### API rules

All collections:
- **Read**: public (no auth)
- **Create / Update / Delete**: `@request.auth.id != ""`

Editor users are created out of band (PocketBase admin UI or migration script): one per stag. The "passphrase" is their password.

### Frontend data flow

1. On mount, `pages/Stag.tsx` calls `pb.collection('stags').getFirstListItem('slug="bcn"')` followed by `pb.collection('days').getFullList({filter:'stag=...',expand:'slots'})` (or two separate calls). One initial fetch.
2. Subscribes to `slots`, `days`, `edits`, `presence` collections via `pb.collection(...).subscribe('*', ...)`, filtered to current stag's records. Updates merge into in-memory state.
3. `time.ts` runs on a 30s `setInterval` to recompute trip state, current slot, T-minus value. Re-renders affected components.
4. Edit actions go through `pb.collection(...).update(...)` → optimistic local state update → PocketBase round-trip → on success, leave optimistic state; on failure, revert and toast.
5. Each edit also creates an `edits` row (client-side, in the same flow). Cheap because PocketBase is fast.

### Time-aware behavior (recap from brainstorming)

Three trip states determined by comparing `now` to the earliest slot's `start_time` and the last slot's day end:

- **pre-trip**: open day 1, show `T-minus X days` badge in the header.
- **in-trip**: open today's day tab. The slot where `now >= slot.start_time` AND `now < next_slot.start_time` (or end-of-day for last slot) gets `.is-now` class. Slots before it get `.is-past` (opacity 0.45, strikethrough on time label).
- **post-trip**: open last day's tab, replace T-minus with `TRIP COMPLETE` badge.

Auto-selection happens only on initial mount. Once the user clicks a tab manually, that choice persists for the session.

Times interpreted in device local timezone (decision logged from brainstorming).

### Edit UX

- Read-only by default. **Edit** toggle button in the header.
- First time Edit is toggled on, render `PassphraseGate` modal: passphrase + display name fields. On success, store JWT (PocketBase SDK does this) and the display name in localStorage.
- In edit mode:
  - Each slot shows a pencil icon → opens `EditSlotModal` (fields: start_time, time_label, title, note, tags, is_featured)
  - Each slot shows a trash icon (confirm-then-delete)
  - Each slot has a drag handle for reorder within its day
  - "+ add slot" button at the end of each day
  - "+ add day" button at the end of the day tabs
  - Days can be deleted from the day tabs (long-press / context menu, confirm)
- Header in edit mode shows: `Last: Tom · 2 min ago · ↶ undo` — undo replays the latest edit's `before` state to its target.
- Header (in any mode) shows the presence row: avatar circles with initials of currently-viewing lads.

### Trust model

- **Passphrase as auth password**. One PocketBase user per stag. Anyone who can read the JS bundle could see the API endpoint, but write operations need a valid JWT, which needs the passphrase.
- **Risk**: a lad shares the passphrase with someone outside the group. Mitigation: edit history + undo means damage is recoverable. If it ever happens, change the password in PocketBase admin and re-share.
- **No CSRF protection needed** since the API uses JWT in `Authorization` header (PocketBase SDK default), not cookies.

### Manifest / PWA

Each `/bcn` and `/sthlm` route exposes a manifest pointing at distinct icons + names. Existing `apple-mobile-web-app-*` meta tags from the source HTML are preserved in `index.html`. No service worker — no offline editing needs.

### Seed migration

`pb_migrations/0002_seed_from_html.js` hand-ports the schedule data from the two source HTMLs into a JS object literal embedded directly in the migration. It then creates `stags`, `days`, `slots` rows idempotently (look up by `slug`/`date`/`sort_order`; insert only if missing).

This is the **chosen approach** over runtime HTML parsing because PocketBase JS hooks run on Goja (a Go-embedded JS interpreter) with a limited DOM and no native parser library — porting the data manually once is faster and more reliable than fighting the runtime.

The original `bcn-stag-2026.html` and `sthlm-stag-2026.html` files are committed to `pocketbase/source-html/` as historical reference only; they aren't read at runtime.

### Editor user setup

Editor users (`bcn-editor`, `sthlm-editor`) are created out of band by an admin migration step: `pb_migrations/0003_editor_users.js` checks for the users and creates them with placeholder passwords on first boot. The real passphrases are set manually via the PocketBase admin UI after deploy. This avoids committing passwords to the repo.

### Deployment

**Web (GitHub Pages)**:
- `.github/workflows/deploy-web.yml`: on push to `main`, run `cd web && npm ci && npm run build`, then deploy `web/dist` to `gh-pages` branch.
- `vite.config.ts` sets `base: '/stags/'` for correct asset paths under the GitHub Pages subpath.
- React Router uses `basename="/stags"`.
- Two routes: `/bcn` and `/sthlm`. Optional: a landing `/` page that links to both.
- `VITE_PB_URL` set as a GitHub Actions secret; injected at build time.

**Backend (Railway)**:
- Railway watches the repo, builds `pocketbase/Dockerfile`.
- Dockerfile: Alpine base, downloads PocketBase binary at the version pinned in the file, copies `pb_migrations/`, exposes port 8090.
- Persistent volume mounted at `/pb/pb_data` for the SQLite file (must match the PocketBase data dir, not `/pb_data`).
- Env vars: none required by PocketBase itself; admin credentials set on first boot via the admin UI.
- Editor user credentials (the passphrases) are configured manually in the admin UI after first deploy.

## Components / units

Each unit has a single purpose and well-defined boundaries:

- `lib/pb.ts` — PocketBase client singleton. Reads `VITE_PB_URL`. No business logic.
- `lib/time.ts` — Pure functions. `determineTripState(stag, now) → 'pre' | 'in' | 'post'`. `findCurrentSlot(daySlots, now) → Slot | null`. `formatTMinus(startDate, now) → string`. Testable in isolation, no DOM or PocketBase coupling.
- `lib/types.ts` — Shared TS types. Generated by hand from the schema, kept in sync manually.
- `pages/Stag.tsx` — Orchestrator: fetch + subscribe + provide state via context to children.
- `components/Slot.tsx` — Pure render based on props. The `.is-now` and `.is-past` class application is decided by the parent based on `time.ts` output, not by the slot itself.
- `components/EditSlotModal.tsx` — Self-contained form. Receives current slot, emits save/cancel.
- `components/PassphraseGate.tsx` — Self-contained auth flow. Emits success once authed.

## Error handling

- **Network failure on read**: show a banner "Couldn't reach server, retrying…" with auto-retry. If localStorage has a cached version, render that as fallback (mark with a "viewing cached" indicator).
- **Network failure on edit**: optimistic update reverts, toast "Couldn't save — try again". The edit history doesn't get a row.
- **Passphrase wrong**: PocketBase returns 400; the gate shows "wrong passphrase, try again".
- **WebSocket drops**: PocketBase SDK auto-reconnects. A brief presence flicker is acceptable.
- **Two simultaneous edits to the same field**: last-write-wins. Acceptable for this scale.

## Testing strategy

- `lib/time.ts`: unit tests with vitest. Inputs are `(stag fixture, now)` tuples covering each trip state and edge cases (exactly at start, between slots, last slot of last day).
- Components: smoke render tests with React Testing Library — not aiming for full coverage, just "doesn't crash, key elements present".
- E2E: skip for v1. The group testing the app *is* the test.
- Manual checklist before sharing the URL:
  1. Load `/bcn` on day 1 morning → today's tab open, first slot highlighted
  2. Toggle edit → enter passphrase → edit a slot → confirm change appears in a second browser within 2s
  3. Delete a slot → undo → restored
  4. Add a new day → reorder slots → all persisted on reload

## Open questions for implementation phase

- Exact icon set for slot tags (Heroicons? lucide-react? small inline SVGs?)
- Drag library choice: `dnd-kit` recommended; light, accessible, good touch support
- Markdown rendering in slot notes: `marked` with sanitization, or just newline-to-`<br>` if formatting is minimal in practice
- Whether to bundle a favicon set or just reuse one icon for both manifests

These are implementation-detail decisions for the writing-plans phase, not architecture.

## Out of scope (deferred)

- Per-lad authentication / accounts
- Push notifications ("event starting in 15min")
- Photo upload per slot
- Maps / location embeds (the original HTMLs have `slot-actions` buttons — preserved as text-only links in v1)
- Sharing or export of the schedule (e.g. ICS calendar file)
- Analytics
