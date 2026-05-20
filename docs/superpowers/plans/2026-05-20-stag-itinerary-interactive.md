# Interactive Stag Itinerary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert two static stag itinerary HTMLs (Barcelona 3–7 June 2026, Stockholm 11–14 June 2026) into a React + Vite frontend on GitHub Pages backed by PocketBase on Railway, with shared real-time editing, passphrase gating, edit history, presence, and time-aware highlighting.

**Architecture:** Frontend is a single Vite/React/TypeScript app served from GitHub Pages with route-based stag selection (`/bcn`, `/sthlm`). Backend is a PocketBase binary on Railway providing DB + REST API + WebSocket realtime + admin UI + auth. All viewers receive shared edits in real time via PocketBase subscriptions; writes are gated by a shared passphrase per stag stored as a PocketBase user password.

**Tech Stack:** React 18, TypeScript, Vite, React Router, PocketBase (server + JS SDK), Vitest, React Testing Library, GitHub Actions, Railway (Dockerfile deploy), Conventional Commits.

**Spec:** [`docs/superpowers/specs/2026-05-20-stag-itinerary-interactive-design.md`](../specs/2026-05-20-stag-itinerary-interactive-design.md)

---

## File Structure

```
stags/
├─ web/
│  ├─ src/
│  │  ├─ main.tsx                       Entry point, mounts <App/>
│  │  ├─ App.tsx                        Router, routes /bcn and /sthlm
│  │  ├─ pages/
│  │  │  └─ Stag.tsx                    Per-stag page; fetch + subscribe + render
│  │  ├─ components/
│  │  │  ├─ Header.tsx                  Title, T-minus badge, edit toggle, presence row, undo bar
│  │  │  ├─ DayTabs.tsx                 Horizontal day selector
│  │  │  ├─ Day.tsx                     Day-section wrapper
│  │  │  ├─ Slot.tsx                    Single slot; renders is-now / is-past states
│  │  │  ├─ EditSlotModal.tsx           Edit form for slot fields
│  │  │  ├─ EditDayModal.tsx            Edit form for day fields
│  │  │  ├─ PassphraseGate.tsx          Login modal (passphrase + display name)
│  │  │  ├─ Presence.tsx                Live viewer avatar row
│  │  │  └─ Toast.tsx                   Simple error/success toast
│  │  ├─ lib/
│  │  │  ├─ pb.ts                       PocketBase client singleton
│  │  │  ├─ time.ts                     Pure time-logic functions (state, currentSlot, T-minus)
│  │  │  ├─ types.ts                    TS types for Stag, Day, Slot, Edit, Presence
│  │  │  ├─ usePresence.ts              Heartbeat + active-viewers hook
│  │  │  ├─ useStagData.ts              Fetch + subscribe to stag/days/slots
│  │  │  ├─ useEditHistory.ts           Last edit query + undo action
│  │  │  └─ markdown.ts                 Trivial **bold** + paragraph renderer
│  │  ├─ styles/
│  │  │  └─ stag.css                    CSS ported from source HTML
│  │  └─ tests/
│  │     ├─ time.test.ts                Unit tests for time.ts
│  │     └─ markdown.test.ts            Unit tests for markdown.ts
│  ├─ public/
│  │  ├─ manifest-bcn.webmanifest
│  │  └─ manifest-sthlm.webmanifest
│  ├─ index.html
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ vite.config.ts
│  └─ vitest.config.ts
├─ pocketbase/
│  ├─ Dockerfile                        Alpine + PocketBase binary
│  ├─ pb_migrations/
│  │  ├─ 1748000000_init_collections.js Creates stags/days/slots/edits/presence
│  │  ├─ 1748000001_seed_from_html.js   Idempotent insert of BCN + STHLM data
│  │  └─ 1748000002_editor_users.js     Creates bcn-editor + sthlm-editor users
│  └─ source-html/
│     ├─ bcn-stag-2026.html             Reference snapshot (copied from Downloads)
│     └─ sthlm-stag-2026.html           Reference snapshot
├─ .github/workflows/
│  └─ deploy-web.yml                    Build web/ → publish to gh-pages
├─ docs/superpowers/                    Specs + plans (already exists)
├─ .gitignore                           (already exists)
└─ README.md
```

**Conventions:**
- Conventional Commits (a pre-commit hook enforces this).
- All tasks end with a commit.
- TDD for pure logic (`time.ts`, `markdown.ts`). Smoke render tests for components. Manual verification for integration.
- Times stored in PocketBase as full ISO datetime strings, interpreted by client as device local time (per spec).

---

## Phase 1 — Backend (PocketBase)

### Task 1: Source HTMLs + PocketBase Dockerfile

**Files:**
- Create: `pocketbase/source-html/bcn-stag-2026.html` (copy from `C:\Users\Abel\Downloads\bcn-stag-2026.html`)
- Create: `pocketbase/source-html/sthlm-stag-2026.html` (copy from `C:\Users\Abel\Downloads\sthlm-stag-2026.html`)
- Create: `pocketbase/Dockerfile`
- Create: `pocketbase/.gitignore`

- [ ] **Step 1: Copy source HTMLs into the repo**

```powershell
New-Item -ItemType Directory -Force pocketbase/source-html
Copy-Item C:\Users\Abel\Downloads\bcn-stag-2026.html pocketbase/source-html/
Copy-Item C:\Users\Abel\Downloads\sthlm-stag-2026.html pocketbase/source-html/
```

- [ ] **Step 2: Write the Dockerfile**

Path: `pocketbase/Dockerfile`

```dockerfile
FROM alpine:3.19

ARG PB_VERSION=0.22.21

RUN apk add --no-cache unzip ca-certificates wget

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip

COPY pb_migrations /pb/pb_migrations

EXPOSE 8090

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

- [ ] **Step 3: Add pocketbase-local-only .gitignore**

Path: `pocketbase/.gitignore`

```
pb_data/
pocketbase
pocketbase.exe
```

- [ ] **Step 4: Commit**

```bash
git add pocketbase/
git commit -m "feat(pocketbase): add Dockerfile and source HTML snapshots"
```

---

### Task 2: PocketBase collections migration

**Files:**
- Create: `pocketbase/pb_migrations/1748000000_init_collections.js`

PocketBase migrations are plain JS files in `pb_migrations/`. The runtime exposes a `migrate(up, down)` API and a `Dao` for record operations. We define five collections: `stags`, `days`, `slots`, `edits`, `presence`.

- [ ] **Step 1: Write the collections migration**

Path: `pocketbase/pb_migrations/1748000000_init_collections.js`

```javascript
/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  // ─── stags ────────────────────────────────────────────────────────────
  const stags = new Collection({
    name: "stags",
    type: "base",
    schema: [
      { name: "slug",             type: "text", required: true, unique: true, options: { max: 32 } },
      { name: "name",             type: "text", required: true },
      { name: "start_date",       type: "date", required: true },
      { name: "end_date",         type: "date", required: true },
      { name: "accent_color",     type: "text" },
      { name: "eyebrow_text",     type: "text" },
      { name: "header_meta_html", type: "text" },
    ],
    listRule:   "",
    viewRule:   "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
  dao.saveCollection(stags);

  // ─── days ─────────────────────────────────────────────────────────────
  const days = new Collection({
    name: "days",
    type: "base",
    schema: [
      { name: "stag",       type: "relation", required: true,
        options: { collectionId: stags.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "date",       type: "date", required: true },
      { name: "title",      type: "text", required: true },
      { name: "subtitle",   type: "text" },
      { name: "sort_order", type: "number", required: true },
    ],
    indexes: ["CREATE INDEX idx_days_stag ON days (stag)"],
    listRule:   "",
    viewRule:   "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
  dao.saveCollection(days);

  // ─── slots ────────────────────────────────────────────────────────────
  const slots = new Collection({
    name: "slots",
    type: "base",
    schema: [
      { name: "day",         type: "relation", required: true,
        options: { collectionId: days.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "start_time",  type: "date",    required: true },
      { name: "time_label",  type: "text",    required: true },
      { name: "title",       type: "text",    required: true },
      { name: "note",        type: "text" },
      { name: "tags",        type: "json" },
      { name: "is_featured", type: "bool" },
      { name: "sort_order",  type: "number",  required: true },
    ],
    indexes: ["CREATE INDEX idx_slots_day ON slots (day)"],
    listRule:   "",
    viewRule:   "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
  dao.saveCollection(slots);

  // ─── edits ────────────────────────────────────────────────────────────
  const edits = new Collection({
    name: "edits",
    type: "base",
    schema: [
      { name: "stag",      type: "relation", required: true,
        options: { collectionId: stags.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "kind",      type: "text", required: true },
      { name: "target_id", type: "text", required: true },
      { name: "before",    type: "json" },
      { name: "after",     type: "json" },
      { name: "who",       type: "text", required: true },
    ],
    indexes: [
      "CREATE INDEX idx_edits_stag_created ON edits (stag, created DESC)"
    ],
    listRule:   "",
    viewRule:   "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
  dao.saveCollection(edits);

  // ─── presence ─────────────────────────────────────────────────────────
  const presence = new Collection({
    name: "presence",
    type: "base",
    schema: [
      { name: "stag",         type: "relation", required: true,
        options: { collectionId: stags.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "session_id",   type: "text", required: true, unique: true },
      { name: "display_name", type: "text", required: true },
      { name: "last_seen",    type: "date", required: true },
    ],
    indexes: ["CREATE INDEX idx_presence_stag ON presence (stag)"],
    listRule:   "",
    viewRule:   "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  });
  dao.saveCollection(presence);
}, (db) => {
  const dao = new Dao(db);
  for (const name of ["presence", "edits", "slots", "days", "stags"]) {
    try { dao.deleteCollection(dao.findCollectionByNameOrId(name)); } catch (_) {}
  }
});
```

> **Note:** `presence` has open create/update/delete rules so any anonymous viewer can heartbeat. Rows are short-lived and contain only a session UUID + display name; no security risk.

- [ ] **Step 2: Commit**

```bash
git add pocketbase/pb_migrations/1748000000_init_collections.js
git commit -m "feat(pocketbase): init collections (stags, days, slots, edits, presence)"
```

---

### Task 3: Seed migration with HTML data

**Files:**
- Create: `pocketbase/pb_migrations/1748000001_seed_from_html.js`

The seed migration is idempotent — re-running does nothing if data is present. Data is hand-ported from the snapshot HTMLs in `source-html/`. Use the existing `slot-time`, `slot-title`, `slot-note`, `slot-tags`, `featured` classes to map every slot.

- [ ] **Step 1: Write the seed migration**

Path: `pocketbase/pb_migrations/1748000001_seed_from_html.js`

```javascript
/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  const stagsData = [
    {
      slug: "bcn",
      name: "Barcelona 2026",
      start_date: "2026-06-03",
      end_date:   "2026-06-07",
      accent_color: "#c84a2c",
      eyebrow_text: "Stag · June 2026",
      header_meta_html: "<strong>3–7 June</strong> · 5 lads building to 8",
      days: [
        {
          date: "2026-06-03", title: "The arrival", subtitle: "",
          slots: [
            // FIXME(seed): port every slot from pocketbase/source-html/bcn-stag-2026.html
            //   one entry per <div class="slot">…</div>, shape below.
            // Example entry (delete this comment after porting):
            {
              start_time: "2026-06-03T22:00",
              time_label: "10:00pm · cocktails",
              title:      "Paradiso",
              note:       "Speakeasy through a pastrami fridge. Showed up on the World's 50 Best Bars list for a reason.",
              tags:       [{ label: "El Born", kind: "walk" }, { label: "Worth queuing", kind: "must" }],
              is_featured: false,
            },
          ],
        },
        // … 2026-06-04, 2026-06-05, 2026-06-06, 2026-06-07
      ],
    },
    {
      slug: "sthlm",
      name: "Stockholm 2026",
      start_date: "2026-06-11",
      end_date:   "2026-06-14",
      accent_color: "#3a6ea5",
      eyebrow_text: "Stag · June 2026",
      header_meta_html: "<strong>11–14 June</strong>",
      days: [
        // … one entry per day from sthlm-stag-2026.html
      ],
    },
  ];

  for (const stagData of stagsData) {
    // Skip if stag already exists (idempotent)
    let stag;
    try {
      stag = dao.findFirstRecordByData("stags", "slug", stagData.slug);
    } catch (_) {
      const stagCol = dao.findCollectionByNameOrId("stags");
      stag = new Record(stagCol, {
        slug: stagData.slug,
        name: stagData.name,
        start_date: stagData.start_date,
        end_date:   stagData.end_date,
        accent_color: stagData.accent_color,
        eyebrow_text: stagData.eyebrow_text,
        header_meta_html: stagData.header_meta_html,
      });
      dao.saveRecord(stag);
    }

    const dayCol  = dao.findCollectionByNameOrId("days");
    const slotCol = dao.findCollectionByNameOrId("slots");

    let dayOrder = 0;
    for (const d of stagData.days) {
      let day;
      try {
        day = dao.findFirstRecordByFilter(
          "days",
          "stag = {:stag} && date = {:date}",
          { stag: stag.id, date: d.date }
        );
      } catch (_) {
        day = new Record(dayCol, {
          stag: stag.id,
          date: d.date,
          title: d.title,
          subtitle: d.subtitle || "",
          sort_order: dayOrder,
        });
        dao.saveRecord(day);
      }
      dayOrder++;

      let slotOrder = 0;
      for (const s of d.slots) {
        const existing = dao.findRecordsByFilter(
          "slots",
          "day = {:day} && sort_order = {:so}",
          "",
          1, 0,
          { day: day.id, so: slotOrder }
        );
        if (existing.length === 0) {
          const slot = new Record(slotCol, {
            day:         day.id,
            start_time:  s.start_time,
            time_label:  s.time_label,
            title:       s.title,
            note:        s.note,
            tags:        s.tags,
            is_featured: !!s.is_featured,
            sort_order:  slotOrder,
          });
          dao.saveRecord(slot);
        }
        slotOrder++;
      }
    }
  }
}, (db) => {
  const dao = new Dao(db);
  for (const slug of ["bcn", "sthlm"]) {
    try {
      const stag = dao.findFirstRecordByData("stags", "slug", slug);
      dao.deleteRecord(stag); // cascade deletes days + slots
    } catch (_) {}
  }
});
```

- [ ] **Step 2: Port the rest of the slot data**

Open `pocketbase/source-html/bcn-stag-2026.html`. For every `<section class="day-section">` add a day entry; for every `<div class="slot">` inside it add a slot entry following the shape above. The mapping:

| HTML | JS object key |
|---|---|
| `<div class="slot-time">7:30pm · Swedish classics</div>` | `time_label: "7:30pm · Swedish classics"`, `start_time: "2026-06-11T19:30"` (derive from the day's date + parsed time) |
| `<div class="slot-title">Lilla Gästabud</div>` | `title: "Lilla Gästabud"` |
| `<p class="slot-note">…</p>` | `note: "…"` (concatenate multiple `<p>` with `\n\n`) |
| `<span class="tag tag-walk">Gamla Stan · 10 min</span>` | `tags: [{label: "Gamla Stan · 10 min", kind: "walk"}, …]` |
| `<div class="slot featured">` | `is_featured: true` |

Delete the `FIXME(seed)` comment + example entry once real data is in. Repeat for `sthlm-stag-2026.html`.

- [ ] **Step 3: Commit**

```bash
git add pocketbase/pb_migrations/1748000001_seed_from_html.js
git commit -m "feat(pocketbase): seed Barcelona + Stockholm stag schedules"
```

---

### Task 4: Editor users migration

**Files:**
- Create: `pocketbase/pb_migrations/1748000002_editor_users.js`

The default `users` auth collection ships with PocketBase. We create one record per stag with a placeholder password — the real password gets set via admin UI on first deploy.

- [ ] **Step 1: Write the editor-users migration**

Path: `pocketbase/pb_migrations/1748000002_editor_users.js`

```javascript
/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const usersCol = dao.findCollectionByNameOrId("users");

  const placeholderPassword = "CHANGE_ME_VIA_ADMIN_UI";

  for (const slug of ["bcn", "sthlm"]) {
    const email = `${slug}-editor@stags.local`;
    try {
      dao.findAuthRecordByEmail("users", email);
      // already exists, leave it
    } catch (_) {
      const user = new Record(usersCol, {
        email,
        username: `${slug}-editor`,
        emailVisibility: false,
        verified: true,
      });
      user.setPassword(placeholderPassword);
      dao.saveRecord(user);
    }
  }
}, (db) => {
  const dao = new Dao(db);
  for (const slug of ["bcn", "sthlm"]) {
    try {
      const u = dao.findAuthRecordByEmail("users", `${slug}-editor@stags.local`);
      dao.deleteRecord(u);
    } catch (_) {}
  }
});
```

> **Post-deploy:** open `/_/` on the Railway URL, log in as admin, edit each editor user, and set the real passphrase. Don't ever commit the real passphrase to the repo.

- [ ] **Step 2: Commit**

```bash
git add pocketbase/pb_migrations/1748000002_editor_users.js
git commit -m "feat(pocketbase): create editor users with placeholder passwords"
```

---

### Task 5: Run PocketBase locally and smoke-test

**Files:** none modified.

- [ ] **Step 1: Download PocketBase binary for local dev**

```powershell
$ver = "0.22.21"
Invoke-WebRequest "https://github.com/pocketbase/pocketbase/releases/download/v$ver/pocketbase_$($ver)_windows_amd64.zip" -OutFile pb.zip
Expand-Archive pb.zip -DestinationPath pocketbase/ -Force
Remove-Item pb.zip
```

- [ ] **Step 2: Start PocketBase**

```powershell
cd pocketbase
./pocketbase.exe serve
```

Expected output: `Server started at http://0.0.0.0:8090` and `REST API: http://0.0.0.0:8090/api/` and migration logs showing all three migrations applied.

- [ ] **Step 3: Verify schemas and seed data**

Open `http://127.0.0.1:8090/_/` — admin setup screen. Create an admin account (local only, never deployed).

In another shell, sanity-check the REST API:

```powershell
curl http://127.0.0.1:8090/api/collections/stags/records
```

Expected: JSON list containing two stags (`bcn`, `sthlm`).

```powershell
curl "http://127.0.0.1:8090/api/collections/days/records?filter=stag.slug='bcn'&expand=stag"
```

Expected: 5 days for BCN with correct dates and titles.

- [ ] **Step 4: Stop the server (`Ctrl-C`) — no commit, this was a dev-only smoke test**

---

## Phase 2 — Frontend Scaffold

### Task 6: Vite + React + TypeScript scaffold

**Files:**
- Create: `web/` (via Vite scaffolder)
- Modify: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/index.html`

- [ ] **Step 1: Scaffold with Vite**

```powershell
npm create vite@latest web -- --template react-ts
cd web
npm install
```

- [ ] **Step 2: Install runtime dependencies**

```powershell
npm install pocketbase react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/node
```

- [ ] **Step 3: Configure Vite base path**

Path: `web/vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? "/",
});
```

> The base path is `/` for local dev. The deploy workflow sets `VITE_BASE_PATH=/stags/` for GitHub Pages.

- [ ] **Step 4: Configure Vitest**

Path: `web/vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
});
```

- [ ] **Step 5: Add test setup file**

Path: `web/src/tests/setup.ts`

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 6: Add npm scripts**

Edit `web/package.json` `scripts` section:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 7: Verify it builds and runs**

```powershell
npm run dev
```

Expected: Vite serves at `http://localhost:5173` with the default Vite+React placeholder. Stop with `Ctrl-C`.

```powershell
npm run test
```

Expected: `No test files found` (acceptable — we'll add tests in Task 9).

- [ ] **Step 8: Commit**

```bash
git add web/
git commit -m "chore(web): scaffold Vite + React + TS + Vitest"
```

---

### Task 7: Port CSS and create shared types

**Files:**
- Create: `web/src/styles/stag.css`
- Create: `web/src/lib/types.ts`
- Modify: `web/src/main.tsx` (import the CSS)

- [ ] **Step 1: Port the CSS**

Open `pocketbase/source-html/bcn-stag-2026.html`. Copy everything inside `<style>…</style>` (lines ~14 onwards until `</style>`) into `web/src/styles/stag.css`. Strip the `<style>` tags themselves.

Then **remove** the `:root` variable definitions for `--accent` — they'll be set dynamically per stag via inline style in `Stag.tsx`. The Stockholm file has different accent values; we want one CSS file that both stags share, with per-stag accent injected at render time.

After copying, also append these new rules to the bottom of `stag.css` for the time-aware behaviour and edit mode (paste verbatim):

```css
/* ─── time-aware states ─────────────────────────────────────────────── */
.slot.is-now {
  border: 2px solid var(--accent);
  position: relative;
  animation: now-pulse 2.4s ease-in-out infinite;
}
.slot.is-now::after {
  content: "NOW";
  position: absolute;
  top: 12px; right: 12px;
  background: var(--accent);
  color: var(--bg);
  font-family: 'Inter Tight', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  padding: 3px 8px;
  border-radius: 4px;
}
.slot.is-past { opacity: 0.45; }
.slot.is-past .slot-time { text-decoration: line-through; text-decoration-color: var(--ink-faint); }

@keyframes now-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(200, 74, 44, 0); }
  50%      { box-shadow: 0 0 0 4px rgba(200, 74, 44, 0.15); }
}

.trip-badge {
  display: inline-block;
  background: var(--accent-soft);
  color: var(--ink);
  font-family: 'Inter Tight', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}

/* ─── edit mode ─────────────────────────────────────────────────────── */
.edit-toggle {
  position: absolute;
  top: 24px; right: 24px;
  background: transparent;
  color: var(--accent-soft);
  border: 1px solid var(--accent-soft);
  font-family: 'Inter Tight', sans-serif;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}
.edit-toggle.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }

.slot-edit-icons {
  display: none;
  gap: 8px;
  margin-top: 12px;
}
body.editing .slot-edit-icons { display: flex; }
.slot-edit-icons button {
  background: transparent;
  border: 1px solid var(--line-strong);
  color: var(--ink-soft);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.slot-edit-icons button:hover { color: var(--accent); border-color: var(--accent); }

.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--bg-card);
  width: 92%; max-width: 480px;
  border-radius: 12px;
  padding: 24px;
  max-height: 90vh; overflow-y: auto;
}
.modal h3 { font-family: 'Fraunces', serif; font-weight: 400; margin-bottom: 16px; }
.modal label { display: block; font-size: 12px; color: var(--ink-soft); margin: 12px 0 4px; text-transform: uppercase; letter-spacing: 1px; }
.modal input, .modal textarea {
  width: 100%; padding: 8px 10px; font-size: 14px;
  border: 1px solid var(--line-strong); border-radius: 6px;
  font-family: 'Inter Tight', sans-serif; background: var(--bg);
  color: var(--ink);
}
.modal textarea { min-height: 100px; resize: vertical; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
.modal-actions button { padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; }
.modal-actions .primary { background: var(--accent); color: var(--bg); border: none; }
.modal-actions .secondary { background: transparent; color: var(--ink-soft); border: 1px solid var(--line-strong); }

/* ─── presence ──────────────────────────────────────────────────────── */
.presence-row { display: flex; gap: -8px; margin-top: 12px; }
.presence-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--bg);
  font-family: 'Inter Tight', sans-serif;
  font-size: 11px;
  font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--ink);
  margin-left: -6px;
}
.presence-avatar:first-child { margin-left: 0; }

/* ─── toast ─────────────────────────────────────────────────────────── */
.toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: var(--ink); color: var(--bg);
  padding: 10px 20px; border-radius: 999px;
  font-size: 13px;
  z-index: 200;
}
.toast.error { background: #b53824; }

/* ─── undo bar ──────────────────────────────────────────────────────── */
.undo-bar {
  font-size: 11px; color: var(--accent-soft);
  display: flex; align-items: center; gap: 8px;
  margin-top: 8px;
}
.undo-bar button {
  background: transparent;
  border: 1px solid var(--accent-soft);
  color: var(--accent-soft);
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
}
```

- [ ] **Step 2: Import CSS in entry point**

Modify `web/src/main.tsx`:

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/stag.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Define shared TS types**

Path: `web/src/lib/types.ts`

```typescript
export interface Stag {
  id: string;
  slug: "bcn" | "sthlm";
  name: string;
  start_date: string;       // "YYYY-MM-DD"
  end_date: string;
  accent_color: string;
  eyebrow_text: string;
  header_meta_html: string;
}

export type TagKind =
  | "walk" | "metro" | "train" | "taxi" | "must" | "book" | "info";

export interface Tag {
  label: string;
  kind: TagKind;
}

export interface Day {
  id: string;
  stag: string;             // stag.id
  date: string;             // "YYYY-MM-DD"
  title: string;
  subtitle: string;
  sort_order: number;
}

export interface Slot {
  id: string;
  day: string;              // day.id
  start_time: string;       // ISO datetime "YYYY-MM-DDTHH:mm"
  time_label: string;       // "7:30pm · cocktails"
  title: string;
  note: string;
  tags: Tag[];
  is_featured: boolean;
  sort_order: number;
}

export interface Edit {
  id: string;
  stag: string;
  kind: string;             // "slot.update" | "slot.create" | etc.
  target_id: string;
  before: unknown;
  after: unknown;
  who: string;
  created: string;          // PocketBase autodate
}

export interface PresenceRow {
  id: string;
  stag: string;
  session_id: string;
  display_name: string;
  last_seen: string;        // ISO datetime
}

export type TripState = "pre" | "in" | "post";
```

- [ ] **Step 4: Commit**

```bash
git add web/src/styles/stag.css web/src/lib/types.ts web/src/main.tsx
git commit -m "feat(web): port stag CSS and define shared types"
```

---

### Task 8: PocketBase client + .env

**Files:**
- Create: `web/src/lib/pb.ts`
- Create: `web/.env.local`
- Modify: `web/.gitignore` (handled by root .gitignore but verify)

- [ ] **Step 1: Set up the PocketBase client**

Path: `web/src/lib/pb.ts`

```typescript
import PocketBase from "pocketbase";

const url = import.meta.env.VITE_PB_URL;
if (!url) {
  throw new Error("VITE_PB_URL is not set. Add it to web/.env.local for dev or as a GH Actions secret for build.");
}

export const pb = new PocketBase(url);

// Keep auth token across reloads — pocketbase-js does this in localStorage by default.
```

- [ ] **Step 2: Add local env file**

Path: `web/.env.local`

```
VITE_PB_URL=http://127.0.0.1:8090
```

> The root `.gitignore` already excludes `.env.local`. Confirm with `git status` that it doesn't appear.

- [ ] **Step 3: Add a placeholder `.env.example` so the convention is visible**

Path: `web/.env.example`

```
VITE_PB_URL=http://127.0.0.1:8090
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/pb.ts web/.env.example
git commit -m "feat(web): add PocketBase client singleton + env scaffold"
```

---

## Phase 3 — Read-Only Rendering

### Task 9: Router + Stag page skeleton (read-only)

**Files:**
- Create: `web/src/App.tsx` (replace Vite default)
- Create: `web/src/pages/Stag.tsx`
- Create: `web/src/lib/useStagData.ts`

- [ ] **Step 1: Write the router**

Path: `web/src/App.tsx`

```tsx
import { BrowserRouter, Route, Routes, Link, Navigate } from "react-router-dom";
import Stag from "./pages/Stag";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

function Landing() {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Stags</h1>
      <ul>
        <li><Link to="/bcn">Barcelona 2026</Link></li>
        <li><Link to="/sthlm">Stockholm 2026</Link></li>
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/bcn" element={<Stag slug="bcn" />} />
        <Route path="/sthlm" element={<Stag slug="sthlm" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Write the data hook**

Path: `web/src/lib/useStagData.ts`

```typescript
import { useEffect, useState } from "react";
import { pb } from "./pb";
import type { Stag, Day, Slot } from "./types";

export interface StagBundle {
  stag: Stag;
  days: Day[];
  slots: Slot[];
}

export function useStagData(slug: string) {
  const [bundle, setBundle] = useState<StagBundle | null>(null);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const stag = await pb.collection("stags").getFirstListItem<Stag>(`slug="${slug}"`);
        const days = await pb.collection("days").getFullList<Day>({
          filter: `stag="${stag.id}"`,
          sort:   "sort_order",
        });
        const dayIds = days.map(d => `"${d.id}"`).join(",");
        const slots = days.length === 0 ? [] : await pb.collection("slots").getFullList<Slot>({
          filter: `day ?~ ${dayIds.length === 0 ? "''" : dayIds}`,
          sort:   "sort_order",
        });
        if (!cancelled) setBundle({ stag, days, slots });
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    load();
    return () => { cancelled = true; };
  }, [slug]);

  return { bundle, error, setBundle };
}
```

> **Note:** PocketBase's `?~` operator on a list filter works for matching any of a set. The constructed filter `day ?~ "id1","id2","id3"` reads "day is one of these". If this doesn't parse cleanly, alternative is `days.length === 1 ? day = "..." : day = "..." || day = "..."` — same result.

- [ ] **Step 3: Write the Stag page (read-only, minimal)**

Path: `web/src/pages/Stag.tsx`

```tsx
import { useEffect } from "react";
import { useStagData } from "../lib/useStagData";

export default function Stag({ slug }: { slug: string }) {
  const { bundle, error } = useStagData(slug);

  useEffect(() => {
    if (bundle?.stag.accent_color) {
      document.documentElement.style.setProperty("--accent", bundle.stag.accent_color);
    }
  }, [bundle]);

  if (error)  return <div style={{ padding: 24 }}>Failed to load: {error}</div>;
  if (!bundle) return <div style={{ padding: 24 }}>Loading…</div>;

  const { stag, days, slots } = bundle;
  const slotsByDay = new Map<string, typeof slots>();
  for (const s of slots) {
    const list = slotsByDay.get(s.day) ?? [];
    list.push(s);
    slotsByDay.set(s.day, list);
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-eyebrow">{stag.eyebrow_text}</div>
        <h1>{stag.name}</h1>
        <div className="header-meta" dangerouslySetInnerHTML={{ __html: stag.header_meta_html }} />
      </header>
      {days.map(d => (
        <section key={d.id} className="day-section active">
          <div className="day-heading">
            <div className="day-date">{new Date(d.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
            <h2 className="day-title">{d.title}</h2>
          </div>
          {(slotsByDay.get(d.id) ?? []).map(s => (
            <div key={s.id} className={`slot${s.is_featured ? " featured" : ""}`}>
              <div className="slot-time">{s.time_label}</div>
              <div className="slot-title">{s.title}</div>
              <div className="slot-tags">
                {s.tags?.map((t, i) => <span key={i} className={`tag tag-${t.kind}`}>{t.label}</span>)}
              </div>
              <p className="slot-note">{s.note}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
```

> All days render simultaneously here — that's intentional for this milestone. Day-tab switching comes in Task 10.

- [ ] **Step 4: Run the app and verify**

Ensure PocketBase is running locally (`cd pocketbase && ./pocketbase.exe serve`).

```powershell
cd web
npm run dev
```

Open `http://localhost:5173/bcn`. Expected: stags header renders with correct title, days listed in order with their slots. CSS looks like the original HTML (modulo the day tabs which aren't built yet).

- [ ] **Step 5: Commit**

```bash
git add web/src/App.tsx web/src/pages/Stag.tsx web/src/lib/useStagData.ts
git commit -m "feat(web): read-only stag page rendering from PocketBase"
```

---

### Task 10: Component split — DayTabs, Day, Slot, Header

**Files:**
- Create: `web/src/components/Header.tsx`
- Create: `web/src/components/DayTabs.tsx`
- Create: `web/src/components/Day.tsx`
- Create: `web/src/components/Slot.tsx`
- Modify: `web/src/pages/Stag.tsx`

Extract the inline JSX from `Stag.tsx` into focused components and add day-tab switching.

- [ ] **Step 1: Write the Slot component**

Path: `web/src/components/Slot.tsx`

```tsx
import type { Slot as SlotType } from "../lib/types";

interface Props {
  slot: SlotType;
  state?: "past" | "now" | "future";
}

export default function Slot({ slot, state = "future" }: Props) {
  const classes = ["slot"];
  if (slot.is_featured) classes.push("featured");
  if (state === "now")  classes.push("is-now");
  if (state === "past") classes.push("is-past");

  return (
    <div className={classes.join(" ")}>
      <div className="slot-time">{slot.time_label}</div>
      <div className="slot-title">{slot.title}</div>
      {slot.tags && slot.tags.length > 0 && (
        <div className="slot-tags">
          {slot.tags.map((t, i) => <span key={i} className={`tag tag-${t.kind}`}>{t.label}</span>)}
        </div>
      )}
      {slot.note && <p className="slot-note">{slot.note}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Write the Day component**

Path: `web/src/components/Day.tsx`

```tsx
import type { Day as DayType, Slot as SlotType } from "../lib/types";
import Slot from "./Slot";

interface Props {
  day: DayType;
  slots: SlotType[];
  active: boolean;
  slotStates?: Map<string, "past" | "now" | "future">;
}

export default function Day({ day, slots, active, slotStates }: Props) {
  return (
    <section className={`day-section${active ? " active" : ""}`} data-day-id={day.id}>
      <div className="day-heading">
        <div className="day-date">
          {new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h2 className="day-title">{day.title}</h2>
        {day.subtitle && <div className="day-meta">{day.subtitle}</div>}
      </div>
      {slots.map(s => (
        <Slot key={s.id} slot={s} state={slotStates?.get(s.id) ?? "future"} />
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Write the DayTabs component**

Path: `web/src/components/DayTabs.tsx`

```tsx
import type { Day as DayType } from "../lib/types";

interface Props {
  days: DayType[];
  activeDayId: string;
  onSelect: (dayId: string) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DayTabs({ days, activeDayId, onSelect }: Props) {
  return (
    <nav className="day-tabs">
      {days.map(d => {
        const dt = new Date(d.date);
        return (
          <button
            key={d.id}
            className={`tab${d.id === activeDayId ? " active" : ""}`}
            onClick={() => onSelect(d.id)}
          >
            {DAY_NAMES[dt.getDay()]}
            <span className="day-num">{dt.getDate()}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Write the Header component (read-only version)**

Path: `web/src/components/Header.tsx`

```tsx
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
```

- [ ] **Step 5: Refactor Stag.tsx to use components and add tab state**

Replace `web/src/pages/Stag.tsx` entirely:

```tsx
import { useEffect, useState, useMemo } from "react";
import { useStagData } from "../lib/useStagData";
import Header from "../components/Header";
import DayTabs from "../components/DayTabs";
import Day from "../components/Day";

export default function Stag({ slug }: { slug: string }) {
  const { bundle, error } = useStagData(slug);
  const [activeDayId, setActiveDayId] = useState<string>("");

  useEffect(() => {
    if (bundle?.stag.accent_color) {
      document.documentElement.style.setProperty("--accent", bundle.stag.accent_color);
    }
    if (bundle && !activeDayId && bundle.days.length > 0) {
      setActiveDayId(bundle.days[0].id);
    }
  }, [bundle, activeDayId]);

  const slotsByDay = useMemo(() => {
    const m = new Map<string, typeof bundle.slots>();
    if (!bundle) return m;
    for (const s of bundle.slots) {
      const list = m.get(s.day) ?? [];
      list.push(s);
      m.set(s.day, list);
    }
    return m;
  }, [bundle]);

  if (error)   return <div style={{ padding: 24 }}>Failed to load: {error}</div>;
  if (!bundle) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div className="container">
      <Header stag={bundle.stag} />
      <DayTabs days={bundle.days} activeDayId={activeDayId} onSelect={setActiveDayId} />
      {bundle.days.map(d => (
        <Day
          key={d.id}
          day={d}
          slots={slotsByDay.get(d.id) ?? []}
          active={d.id === activeDayId}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run dev server and verify tabs work**

```powershell
cd web
npm run dev
```

Open `http://localhost:5173/bcn`. Click each day tab — should toggle which day-section is visible. Should look near-identical to the source HTML now.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/ web/src/pages/Stag.tsx
git commit -m "feat(web): split Stag page into Header, DayTabs, Day, Slot components"
```

---

## Phase 4 — Time-Aware Logic

### Task 11: time.ts — pure functions + TDD

**Files:**
- Create: `web/src/lib/time.ts`
- Create: `web/src/tests/time.test.ts`

- [ ] **Step 1: Write failing tests**

Path: `web/src/tests/time.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  determineTripState,
  findCurrentSlot,
  findTodayDayId,
  formatTMinus,
} from "../lib/time";
import type { Stag, Day, Slot } from "../lib/types";

const stag: Stag = {
  id: "s1", slug: "bcn", name: "Barcelona", accent_color: "#c84a2c",
  start_date: "2026-06-03", end_date: "2026-06-07",
  eyebrow_text: "", header_meta_html: "",
};

const days: Day[] = [
  { id: "d1", stag: "s1", date: "2026-06-03", title: "Arrival",   subtitle: "", sort_order: 0 },
  { id: "d2", stag: "s1", date: "2026-06-04", title: "Primavera", subtitle: "", sort_order: 1 },
];

const slots: Slot[] = [
  { id: "sl1", day: "d1", start_time: "2026-06-03T20:00", time_label: "8pm", title: "Arrive", note: "", tags: [], is_featured: false, sort_order: 0 },
  { id: "sl2", day: "d1", start_time: "2026-06-03T22:00", time_label: "10pm", title: "Bar",   note: "", tags: [], is_featured: false, sort_order: 1 },
  { id: "sl3", day: "d2", start_time: "2026-06-04T11:00", time_label: "11am", title: "Coffee", note: "", tags: [], is_featured: false, sort_order: 0 },
];

describe("determineTripState", () => {
  it("returns 'pre' before start", () => {
    expect(determineTripState(stag, new Date("2026-06-02T12:00"))).toBe("pre");
  });
  it("returns 'in' during trip", () => {
    expect(determineTripState(stag, new Date("2026-06-05T09:00"))).toBe("in");
  });
  it("returns 'post' after end of last day", () => {
    expect(determineTripState(stag, new Date("2026-06-08T01:00"))).toBe("post");
  });
  it("returns 'in' on the morning of day 1 even before first slot", () => {
    expect(determineTripState(stag, new Date("2026-06-03T08:00"))).toBe("in");
  });
});

describe("findTodayDayId", () => {
  it("returns today's day id if today matches a day", () => {
    expect(findTodayDayId(days, new Date("2026-06-04T10:30"))).toBe("d2");
  });
  it("returns null if today doesn't match a day", () => {
    expect(findTodayDayId(days, new Date("2026-06-01T10:30"))).toBe(null);
  });
});

describe("findCurrentSlot", () => {
  it("returns the slot currently in progress", () => {
    const r = findCurrentSlot(slots, "d1", new Date("2026-06-03T21:30"));
    expect(r).toBe("sl1");
  });
  it("returns the next slot once its start_time passes", () => {
    const r = findCurrentSlot(slots, "d1", new Date("2026-06-03T22:00"));
    expect(r).toBe("sl2");
  });
  it("returns null if before the first slot of the day", () => {
    const r = findCurrentSlot(slots, "d1", new Date("2026-06-03T18:00"));
    expect(r).toBe(null);
  });
  it("keeps the last slot as current until end of day", () => {
    const r = findCurrentSlot(slots, "d1", new Date("2026-06-03T23:59"));
    expect(r).toBe("sl2");
  });
});

describe("formatTMinus", () => {
  it("formats whole days until start", () => {
    expect(formatTMinus("2026-06-03", new Date("2026-05-30T12:00"))).toBe("T-minus 4 days");
  });
  it("says 'tomorrow' when one day out", () => {
    expect(formatTMinus("2026-06-03", new Date("2026-06-02T12:00"))).toBe("T-minus 1 day");
  });
  it("returns 'today' when same day", () => {
    expect(formatTMinus("2026-06-03", new Date("2026-06-03T09:00"))).toBe("Today");
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

```powershell
cd web
npm run test
```

Expected: 11 failing tests, all with "Cannot find module '../lib/time'".

- [ ] **Step 3: Implement `lib/time.ts`**

Path: `web/src/lib/time.ts`

```typescript
import type { Stag, Day, Slot, TripState } from "./types";

export function determineTripState(stag: Stag, now: Date): TripState {
  const start = new Date(stag.start_date + "T00:00");
  const end   = new Date(stag.end_date   + "T23:59:59");
  if (now < start) return "pre";
  if (now > end)   return "post";
  return "in";
}

export function findTodayDayId(days: Day[], now: Date): string | null {
  const yyyyMmDd = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const today = yyyyMmDd(now);
  return days.find(d => d.date === today)?.id ?? null;
}

export function findCurrentSlot(
  allSlots: Slot[],
  dayId: string,
  now: Date,
): string | null {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const slots = allSlots
    .filter(s => s.day === dayId)
    .map(s => ({ ...s, start: new Date(s.start_time) }))
    .sort((a, b) => +a.start - +b.start);

  if (slots.length === 0) return null;
  if (now < slots[0].start) return null;

  for (let i = 0; i < slots.length; i++) {
    const cur  = slots[i];
    const next = slots[i + 1];
    const upper = next ? next.start : dayEnd;
    if (now >= cur.start && now < upper) return cur.id;
  }
  return slots[slots.length - 1].id;
}

export function formatTMinus(startDate: string, now: Date): string {
  const start = new Date(startDate + "T00:00");
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((+start - +today) / msPerDay);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "T-minus 1 day";
  return `T-minus ${diffDays} days`;
}

export function slotStateMap(
  slots: Slot[],
  dayId: string,
  now: Date,
): Map<string, "past" | "now" | "future"> {
  const m = new Map<string, "past" | "now" | "future">();
  const currentId = findCurrentSlot(slots, dayId, now);
  const daySlots = slots
    .filter(s => s.day === dayId)
    .sort((a, b) => a.sort_order - b.sort_order);

  let foundCurrent = false;
  for (const s of daySlots) {
    if (s.id === currentId) { m.set(s.id, "now"); foundCurrent = true; continue; }
    m.set(s.id, foundCurrent ? "future" : "past");
  }
  // Adjustment: if no current slot (pre-first-slot of the day), all slots are future
  if (!currentId) {
    for (const s of daySlots) m.set(s.id, "future");
  }
  return m;
}
```

- [ ] **Step 4: Run tests and verify they pass**

```powershell
npm run test
```

Expected: All 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/time.ts web/src/tests/time.test.ts
git commit -m "feat(web): time-aware logic (state, currentSlot, T-minus) with TDD"
```

---

### Task 12: Wire time logic into Stag page

**Files:**
- Modify: `web/src/pages/Stag.tsx`

Add: auto-select today's day tab, pass slot-state map to Day, show T-minus / TRIP COMPLETE badge, re-tick every 30s.

- [ ] **Step 1: Replace Stag.tsx with time-aware version**

Path: `web/src/pages/Stag.tsx`

```tsx
import { useEffect, useState, useMemo } from "react";
import { useStagData } from "../lib/useStagData";
import { determineTripState, findTodayDayId, formatTMinus, slotStateMap } from "../lib/time";
import Header from "../components/Header";
import DayTabs from "../components/DayTabs";
import Day from "../components/Day";

export default function Stag({ slug }: { slug: string }) {
  const { bundle, error } = useStagData(slug);
  const [activeDayId, setActiveDayId] = useState<string>("");
  const [userPickedDay, setUserPickedDay] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (bundle?.stag.accent_color) {
      document.documentElement.style.setProperty("--accent", bundle.stag.accent_color);
    }
  }, [bundle]);

  useEffect(() => {
    if (!bundle || userPickedDay) return;
    const state = determineTripState(bundle.stag, now);
    if (state === "in") {
      const todayId = findTodayDayId(bundle.days, now);
      setActiveDayId(todayId ?? bundle.days[0]?.id ?? "");
    } else if (state === "post") {
      setActiveDayId(bundle.days[bundle.days.length - 1]?.id ?? "");
    } else {
      setActiveDayId(bundle.days[0]?.id ?? "");
    }
  }, [bundle, userPickedDay, now]);

  const slotsByDay = useMemo(() => {
    const m = new Map<string, typeof bundle.slots>();
    if (!bundle) return m;
    for (const s of bundle.slots) {
      const list = m.get(s.day) ?? [];
      list.push(s);
      m.set(s.day, list);
    }
    return m;
  }, [bundle]);

  const slotStates = useMemo(() => {
    if (!bundle) return new Map<string, Map<string, "past" | "now" | "future">>();
    const all = new Map<string, Map<string, "past" | "now" | "future">>();
    const todayId = findTodayDayId(bundle.days, now);
    for (const d of bundle.days) {
      all.set(d.id, d.id === todayId ? slotStateMap(bundle.slots, d.id, now) : new Map());
    }
    return all;
  }, [bundle, now]);

  if (error)   return <div style={{ padding: 24 }}>Failed to load: {error}</div>;
  if (!bundle) return <div style={{ padding: 24 }}>Loading…</div>;

  const state = determineTripState(bundle.stag, now);
  const badge =
    state === "pre"  ? formatTMinus(bundle.stag.start_date, now) :
    state === "post" ? "Trip complete" : undefined;

  return (
    <div className="container">
      <Header stag={bundle.stag} tripBadge={badge} />
      <DayTabs
        days={bundle.days}
        activeDayId={activeDayId}
        onSelect={(id) => { setActiveDayId(id); setUserPickedDay(true); }}
      />
      {bundle.days.map(d => (
        <Day
          key={d.id}
          day={d}
          slots={slotsByDay.get(d.id) ?? []}
          active={d.id === activeDayId}
          slotStates={slotStates.get(d.id)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Start PocketBase and the dev server. Open `http://localhost:5173/bcn`.

- **Pre-trip** (today is 2026-05-20, trip starts 2026-06-03): header should show `T-MINUS 14 DAYS`. Day 1 tab is active.
- Temporarily override `now` in the URL — easier: change your system clock to 2026-06-04T13:00 to simulate during-trip, reload. Today's tab (Thursday) auto-opens, the slot whose start_time has passed is highlighted with `NOW`, slots before it are dimmed and strikethrough.
- Set clock to 2026-06-08. Should show `TRIP COMPLETE` and Sunday tab open.
- Restore your system clock.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/Stag.tsx
git commit -m "feat(web): wire time-aware highlighting and trip badges"
```

---

## Phase 5 — Realtime

### Task 13: PocketBase realtime subscriptions

**Files:**
- Modify: `web/src/lib/useStagData.ts`

Subscribe to `slots`, `days`, `stags` changes and merge into local state.

- [ ] **Step 1: Add subscriptions to useStagData**

Replace `web/src/lib/useStagData.ts`:

```typescript
import { useEffect, useState } from "react";
import { pb } from "./pb";
import type { Stag, Day, Slot } from "./types";

export interface StagBundle {
  stag: Stag;
  days: Day[];
  slots: Slot[];
}

export function useStagData(slug: string) {
  const [bundle, setBundle] = useState<StagBundle | null>(null);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    async function load() {
      try {
        const stag = await pb.collection("stags").getFirstListItem<Stag>(`slug="${slug}"`);
        const days = await pb.collection("days").getFullList<Day>({
          filter: `stag="${stag.id}"`,
          sort:   "sort_order",
        });
        const slots = days.length === 0 ? [] : await pb.collection("slots").getFullList<Slot>({
          filter: days.map(d => `day="${d.id}"`).join(" || "),
          sort:   "sort_order",
        });
        if (cancelled) return;
        setBundle({ stag, days, slots });

        // ─── Subscribe ─────────────────────────────────────────
        const stagUnsub = await pb.collection("stags").subscribe<Stag>(stag.id, (e) => {
          setBundle(b => b ? { ...b, stag: e.record } : b);
        });
        unsubs.push(() => stagUnsub());

        const daysUnsub = await pb.collection("days").subscribe<Day>("*", (e) => {
          setBundle(b => {
            if (!b || e.record.stag !== stag.id) return b;
            const next = { ...b };
            if (e.action === "create") next.days = [...b.days, e.record];
            if (e.action === "update") next.days = b.days.map(d => d.id === e.record.id ? e.record : d);
            if (e.action === "delete") next.days = b.days.filter(d => d.id !== e.record.id);
            next.days.sort((a, b) => a.sort_order - b.sort_order);
            return next;
          });
        });
        unsubs.push(() => daysUnsub());

        const slotsUnsub = await pb.collection("slots").subscribe<Slot>("*", (e) => {
          setBundle(b => {
            if (!b) return b;
            const dayBelongsToStag = b.days.some(d => d.id === e.record.day);
            if (!dayBelongsToStag && e.action !== "delete") return b;
            const next = { ...b };
            if (e.action === "create") next.slots = [...b.slots, e.record];
            if (e.action === "update") next.slots = b.slots.map(s => s.id === e.record.id ? e.record : s);
            if (e.action === "delete") next.slots = b.slots.filter(s => s.id !== e.record.id);
            return next;
          });
        });
        unsubs.push(() => slotsUnsub());
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    load();
    return () => {
      cancelled = true;
      for (const u of unsubs) u();
    };
  }, [slug]);

  return { bundle, error, setBundle };
}
```

- [ ] **Step 2: Manual verification**

Open `http://localhost:5173/bcn` in two browser windows side-by-side. In a third terminal:

```powershell
curl -X PATCH http://127.0.0.1:8090/api/collections/slots/records/<slot-id> `
  -H "Authorization: Bearer <admin-token>" `
  -H "Content-Type: application/json" `
  -d '{"title": "Updated from CLI"}'
```

(To get an admin token, log into `/_/` and copy from devtools; or skip this until Task 14 makes editing easy from the UI.)

For now, just verify the subscription doesn't crash the app — check browser devtools for WS errors. Both windows should show the same data; we'll validate sync once edit mode exists.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/useStagData.ts
git commit -m "feat(web): subscribe to PocketBase realtime updates for stag data"
```

---

## Phase 6 — Edit Mode

### Task 14: PassphraseGate + auth state

**Files:**
- Create: `web/src/components/PassphraseGate.tsx`
- Modify: `web/src/components/Header.tsx`
- Modify: `web/src/pages/Stag.tsx`

- [ ] **Step 1: Write the PassphraseGate**

Path: `web/src/components/PassphraseGate.tsx`

```tsx
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
```

- [ ] **Step 2: Extend Header with edit toggle**

Replace `web/src/components/Header.tsx`:

```tsx
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
```

- [ ] **Step 3: Wire edit toggle in Stag.tsx**

At the top of `web/src/pages/Stag.tsx`, import the gate and add edit state. Modify the destructuring + JSX:

Add imports:

```tsx
import PassphraseGate from "../components/PassphraseGate";
import { pb } from "../lib/pb";
```

Add state inside the component (near other `useState` calls):

```tsx
const [editing, setEditing] = useState(false);
const [showGate, setShowGate] = useState(false);
const [displayName, setDisplayName] = useState<string>(localStorage.getItem("stags.displayName") ?? "");

useEffect(() => {
  document.body.classList.toggle("editing", editing);
  return () => document.body.classList.remove("editing");
}, [editing]);

function handleToggleEdit() {
  if (editing) {
    setEditing(false);
    return;
  }
  if (pb.authStore.isValid) {
    setEditing(true);
  } else {
    setShowGate(true);
  }
}
```

Update the Header call:

```tsx
<Header
  stag={bundle.stag}
  tripBadge={badge}
  editing={editing}
  onToggleEdit={handleToggleEdit}
/>
```

Render the gate conditionally (before the closing `</div>`):

```tsx
{showGate && (
  <PassphraseGate
    slug={slug}
    onAuthed={(name) => {
      setDisplayName(name);
      setShowGate(false);
      setEditing(true);
    }}
    onCancel={() => setShowGate(false)}
  />
)}
```

- [ ] **Step 4: Manual verification**

Before testing, set the editor user password via PocketBase admin UI (`http://127.0.0.1:8090/_/` → Collections → users → bcn-editor → set password to e.g. `testpass`).

Restart dev server, click Edit on `/bcn`. Modal opens. Enter name + passphrase. Verify modal closes, button shows "Done", `body` has `editing` class.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/PassphraseGate.tsx web/src/components/Header.tsx web/src/pages/Stag.tsx
git commit -m "feat(web): passphrase gate + edit mode toggle"
```

---

### Task 15: EditSlotModal (edit existing slot)

**Files:**
- Create: `web/src/components/EditSlotModal.tsx`
- Modify: `web/src/components/Slot.tsx`

- [ ] **Step 1: Write the EditSlotModal**

Path: `web/src/components/EditSlotModal.tsx`

```tsx
import { useState } from "react";
import type { Slot, Tag, TagKind } from "../lib/types";

interface Props {
  slot: Slot;
  onSave: (patch: Partial<Slot>) => Promise<void>;
  onClose: () => void;
}

const TAG_KINDS: TagKind[] = ["walk", "metro", "train", "taxi", "must", "book", "info"];

export default function EditSlotModal({ slot, onSave, onClose }: Props) {
  const [startTime, setStartTime] = useState(slot.start_time.slice(0, 16));
  const [timeLabel, setTimeLabel] = useState(slot.time_label);
  const [title, setTitle]         = useState(slot.title);
  const [note, setNote]           = useState(slot.note);
  const [isFeatured, setFeatured] = useState(slot.is_featured);
  const [tagsRaw, setTagsRaw]     = useState(JSON.stringify(slot.tags ?? [], null, 2));
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    let parsedTags: Tag[];
    try {
      parsedTags = JSON.parse(tagsRaw);
      if (!Array.isArray(parsedTags)) throw new Error("not array");
      for (const t of parsedTags) {
        if (typeof t.label !== "string" || !TAG_KINDS.includes(t.kind)) {
          throw new Error("invalid tag");
        }
      }
    } catch (e) {
      setError("Tags must be JSON array of {label,kind}.");
      setBusy(false);
      return;
    }
    try {
      await onSave({
        start_time:  startTime,
        time_label:  timeLabel,
        title,
        note,
        is_featured: isFeatured,
        tags:        parsedTags,
      });
      onClose();
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Edit slot</h3>
        <form onSubmit={handleSubmit}>
          <label>Start time</label>
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required />

          <label>Time label (display string)</label>
          <input value={timeLabel} onChange={e => setTimeLabel(e.target.value)} required />

          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required />

          <label>Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} />

          <label>Tags (JSON)</label>
          <textarea value={tagsRaw} onChange={e => setTagsRaw(e.target.value)} style={{ fontFamily: "monospace", fontSize: 12 }} />

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={isFeatured} onChange={e => setFeatured(e.target.checked)} />
            Featured
          </label>

          {error && <div style={{ color: "#b53824", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary" disabled={busy}>{busy ? "…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Extend Slot.tsx with edit controls**

Replace `web/src/components/Slot.tsx`:

```tsx
import { useState } from "react";
import type { Slot as SlotType } from "../lib/types";
import EditSlotModal from "./EditSlotModal";

interface Props {
  slot: SlotType;
  state?: "past" | "now" | "future";
  onSave?: (slotId: string, patch: Partial<SlotType>) => Promise<void>;
  onDelete?: (slotId: string) => Promise<void>;
  onMove?: (slotId: string, direction: "up" | "down") => Promise<void>;
}

export default function Slot({ slot, state = "future", onSave, onDelete, onMove }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const classes = ["slot"];
  if (slot.is_featured) classes.push("featured");
  if (state === "now")  classes.push("is-now");
  if (state === "past") classes.push("is-past");

  return (
    <div className={classes.join(" ")}>
      <div className="slot-time">{slot.time_label}</div>
      <div className="slot-title">{slot.title}</div>
      {slot.tags && slot.tags.length > 0 && (
        <div className="slot-tags">
          {slot.tags.map((t, i) => <span key={i} className={`tag tag-${t.kind}`}>{t.label}</span>)}
        </div>
      )}
      {slot.note && <p className="slot-note">{slot.note}</p>}
      {onSave && (
        <div className="slot-edit-icons">
          <button onClick={() => setEditOpen(true)}>Edit</button>
          {onMove && <button onClick={() => onMove(slot.id, "up")}>↑</button>}
          {onMove && <button onClick={() => onMove(slot.id, "down")}>↓</button>}
          {onDelete && <button onClick={() => {
            if (confirm(`Delete "${slot.title}"?`)) onDelete(slot.id);
          }}>Delete</button>}
        </div>
      )}
      {editOpen && onSave && (
        <EditSlotModal
          slot={slot}
          onSave={(patch) => onSave(slot.id, patch)}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Pass handlers from Day → Slot**

Replace `web/src/components/Day.tsx`:

```tsx
import type { Day as DayType, Slot as SlotType } from "../lib/types";
import Slot from "./Slot";

interface Props {
  day: DayType;
  slots: SlotType[];
  active: boolean;
  slotStates?: Map<string, "past" | "now" | "future">;
  onSlotSave?:   (slotId: string, patch: Partial<SlotType>) => Promise<void>;
  onSlotDelete?: (slotId: string) => Promise<void>;
  onSlotMove?:   (slotId: string, direction: "up" | "down") => Promise<void>;
}

export default function Day({ day, slots, active, slotStates, onSlotSave, onSlotDelete, onSlotMove }: Props) {
  return (
    <section className={`day-section${active ? " active" : ""}`} data-day-id={day.id}>
      <div className="day-heading">
        <div className="day-date">
          {new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h2 className="day-title">{day.title}</h2>
        {day.subtitle && <div className="day-meta">{day.subtitle}</div>}
      </div>
      {slots.map(s => (
        <Slot
          key={s.id}
          slot={s}
          state={slotStates?.get(s.id) ?? "future"}
          onSave={onSlotSave}
          onDelete={onSlotDelete}
          onMove={onSlotMove}
        />
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Wire handlers in Stag.tsx**

Inside `Stag.tsx`, add these handlers near the existing ones. Move/delete touch `sort_order` for the move case; we'll fully build add-slot in Task 16.

Add inside the component:

```tsx
async function handleSlotSave(slotId: string, patch: Partial<typeof bundle.slots[number]>) {
  const before = bundle.slots.find(s => s.id === slotId);
  await pb.collection("slots").update(slotId, patch);
  await pb.collection("edits").create({
    stag:      bundle.stag.id,
    kind:      "slot.update",
    target_id: slotId,
    before,
    after:     { ...before, ...patch },
    who:       displayName || "anon",
  });
}

async function handleSlotDelete(slotId: string) {
  const before = bundle.slots.find(s => s.id === slotId);
  await pb.collection("slots").delete(slotId);
  await pb.collection("edits").create({
    stag:      bundle.stag.id,
    kind:      "slot.delete",
    target_id: slotId,
    before,
    after:     null,
    who:       displayName || "anon",
  });
}

async function handleSlotMove(slotId: string, direction: "up" | "down") {
  const slot = bundle.slots.find(s => s.id === slotId);
  if (!slot) return;
  const daySlots = bundle.slots
    .filter(s => s.day === slot.day)
    .sort((a, b) => a.sort_order - b.sort_order);
  const idx = daySlots.findIndex(s => s.id === slotId);
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= daySlots.length) return;
  const neighbour = daySlots[targetIdx];
  await pb.collection("slots").update(slot.id,      { sort_order: neighbour.sort_order });
  await pb.collection("slots").update(neighbour.id, { sort_order: slot.sort_order });
  await pb.collection("edits").create({
    stag:      bundle.stag.id,
    kind:      "slot.reorder",
    target_id: slotId,
    before:    { sort_order: slot.sort_order, neighbour: neighbour.id, neighbourOrder: neighbour.sort_order },
    after:     { sort_order: neighbour.sort_order, neighbour: neighbour.id, neighbourOrder: slot.sort_order },
    who:       displayName || "anon",
  });
}
```

Pass these handlers when `editing` is true:

```tsx
<Day
  key={d.id}
  day={d}
  slots={slotsByDay.get(d.id) ?? []}
  active={d.id === activeDayId}
  slotStates={slotStates.get(d.id)}
  onSlotSave={editing ? handleSlotSave : undefined}
  onSlotDelete={editing ? handleSlotDelete : undefined}
  onSlotMove={editing ? handleSlotMove : undefined}
/>
```

- [ ] **Step 5: Manual verification**

Toggle edit, click a slot's Edit button, change the title, Save. Confirm:
- Modal closes
- Slot title updates within ~1s (via realtime sub)
- Second browser window also updates

Try ↑ / ↓ — confirm slots reorder. Try Delete — confirm with the prompt, slot disappears.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/EditSlotModal.tsx web/src/components/Slot.tsx web/src/components/Day.tsx web/src/pages/Stag.tsx
git commit -m "feat(web): edit, move, and delete slots in edit mode"
```

---

### Task 16: Add slot / Add day

**Files:**
- Modify: `web/src/components/Day.tsx`
- Modify: `web/src/components/DayTabs.tsx`
- Modify: `web/src/pages/Stag.tsx`

- [ ] **Step 1: Add an "+ add slot" button at the end of each Day**

In `web/src/components/Day.tsx`, accept a new prop and render a button at the bottom when in edit mode:

```tsx
interface Props {
  // ...existing props
  onAddSlot?: (dayId: string) => Promise<void>;
}
```

Inside the JSX, after the `slots.map`:

```tsx
{onAddSlot && (
  <button
    className="slot"
    style={{ width: "100%", border: "1px dashed var(--line-strong)", background: "transparent", cursor: "pointer", padding: 16, color: "var(--ink-faint)" }}
    onClick={() => onAddSlot(day.id)}
  >
    + add slot
  </button>
)}
```

- [ ] **Step 2: Add an "+ add day" button to DayTabs**

In `web/src/components/DayTabs.tsx`:

```tsx
interface Props {
  // ...existing
  onAddDay?: () => Promise<void>;
}

// inside the <nav>, after the days.map:
{onAddDay && (
  <button className="tab" onClick={onAddDay} title="Add day">+</button>
)}
```

- [ ] **Step 3: Handlers in Stag.tsx**

Add inside the component:

```tsx
async function handleAddSlot(dayId: string) {
  const daySlots = bundle.slots.filter(s => s.day === dayId);
  const nextOrder = daySlots.length === 0 ? 0 : Math.max(...daySlots.map(s => s.sort_order)) + 1;
  const day = bundle.days.find(d => d.id === dayId);
  if (!day) return;
  const created = await pb.collection("slots").create({
    day:         dayId,
    start_time:  `${day.date}T12:00`,
    time_label:  "12:00pm · new slot",
    title:       "New slot",
    note:        "",
    tags:        [],
    is_featured: false,
    sort_order:  nextOrder,
  });
  await pb.collection("edits").create({
    stag:      bundle.stag.id,
    kind:      "slot.create",
    target_id: created.id,
    before:    null,
    after:     created,
    who:       displayName || "anon",
  });
}

async function handleAddDay() {
  const nextOrder = bundle.days.length === 0 ? 0 : Math.max(...bundle.days.map(d => d.sort_order)) + 1;
  const lastDate = bundle.days[bundle.days.length - 1]?.date ?? bundle.stag.end_date;
  const newDate = new Date(lastDate + "T00:00");
  newDate.setDate(newDate.getDate() + 1);
  const dateStr = newDate.toISOString().slice(0, 10);
  const created = await pb.collection("days").create({
    stag:       bundle.stag.id,
    date:       dateStr,
    title:      "New day",
    subtitle:   "",
    sort_order: nextOrder,
  });
  await pb.collection("edits").create({
    stag:      bundle.stag.id,
    kind:      "day.create",
    target_id: created.id,
    before:    null,
    after:     created,
    who:       displayName || "anon",
  });
}

async function handleDeleteDay(dayId: string) {
  const before = bundle.days.find(d => d.id === dayId);
  if (!confirm(`Delete day "${before?.title}" and all its slots?`)) return;
  await pb.collection("days").delete(dayId);
  await pb.collection("edits").create({
    stag:      bundle.stag.id,
    kind:      "day.delete",
    target_id: dayId,
    before,
    after:     null,
    who:       displayName || "anon",
  });
}
```

Pass the handlers to `DayTabs` and `Day`:

```tsx
<DayTabs
  days={bundle.days}
  activeDayId={activeDayId}
  onSelect={(id) => { setActiveDayId(id); setUserPickedDay(true); }}
  onAddDay={editing ? handleAddDay : undefined}
/>
```

```tsx
<Day
  ...
  onAddSlot={editing ? handleAddSlot : undefined}
  // optional: onDeleteDay
/>
```

(Day deletion can be triggered from inside the Day component's heading, or skipped for v1 if you'd rather use the PocketBase admin UI for that occasional action. For v1, add a small "delete day" button to Day heading when in edit mode — pass `onDeleteDay={editing ? handleDeleteDay : undefined}` and render it in `Day.tsx`.)

In `Day.tsx`, accept `onDeleteDay?` prop and render in the heading:

```tsx
{onDeleteDay && (
  <button onClick={() => onDeleteDay(day.id)} style={{ position: "absolute", top: 8, right: 8, fontSize: 11 }}>Delete day</button>
)}
```

- [ ] **Step 4: Manual verification**

Click + at the end of day tabs → new day appears at the end with title "New day". Click + add slot inside a day → new slot appears with default values. Edit the new slot's fields. Delete a day → confirm prompt, day disappears.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/Day.tsx web/src/components/DayTabs.tsx web/src/pages/Stag.tsx
git commit -m "feat(web): add and delete slots and days in edit mode"
```

---

## Phase 7 — Edit History + Undo

### Task 17: Recent edits hook + header bar

**Files:**
- Create: `web/src/lib/useEditHistory.ts`
- Modify: `web/src/components/Header.tsx`
- Modify: `web/src/pages/Stag.tsx`

- [ ] **Step 1: Hook to fetch + subscribe to edits**

Path: `web/src/lib/useEditHistory.ts`

```typescript
import { useEffect, useState } from "react";
import { pb } from "./pb";
import type { Edit } from "./types";

export function useEditHistory(stagId: string | undefined) {
  const [edits, setEdits] = useState<Edit[]>([]);

  useEffect(() => {
    if (!stagId) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;

    async function load() {
      const list = await pb.collection("edits").getFullList<Edit>({
        filter: `stag="${stagId}"`,
        sort:   "-created",
        limit:  20,
      });
      if (cancelled) return;
      setEdits(list);
      const u = await pb.collection("edits").subscribe<Edit>("*", (e) => {
        if (e.record.stag !== stagId) return;
        setEdits(prev => {
          if (e.action === "create") return [e.record, ...prev].slice(0, 20);
          if (e.action === "delete") return prev.filter(r => r.id !== e.record.id);
          return prev;
        });
      });
      unsub = () => u();
    }

    load();
    return () => { cancelled = true; if (unsub) unsub(); };
  }, [stagId]);

  return edits;
}
```

- [ ] **Step 2: Render last edit in Header**

Replace `web/src/components/Header.tsx`:

```tsx
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
```

- [ ] **Step 3: Wire history into Stag.tsx + implement undo**

Add at the top:

```tsx
import { useEditHistory } from "../lib/useEditHistory";
```

Inside the component:

```tsx
const edits = useEditHistory(bundle?.stag.id);
const lastEdit = edits[0];

async function handleUndo() {
  if (!lastEdit) return;
  switch (lastEdit.kind) {
    case "slot.update":
      if (lastEdit.before) {
        const before = lastEdit.before as Slot;
        // Re-apply old values
        await pb.collection("slots").update(lastEdit.target_id, {
          start_time:  before.start_time,
          time_label:  before.time_label,
          title:       before.title,
          note:        before.note,
          tags:        before.tags,
          is_featured: before.is_featured,
        });
      }
      break;
    case "slot.create":
      await pb.collection("slots").delete(lastEdit.target_id);
      break;
    case "slot.delete":
      if (lastEdit.before) {
        const before = lastEdit.before as Slot;
        await pb.collection("slots").create({
          day:         before.day,
          start_time:  before.start_time,
          time_label:  before.time_label,
          title:       before.title,
          note:        before.note,
          tags:        before.tags,
          is_featured: before.is_featured,
          sort_order:  before.sort_order,
        });
      }
      break;
    case "slot.reorder":
      // Swap the sort_orders back
      if (lastEdit.before && lastEdit.after) {
        const beforeData = lastEdit.before as { sort_order: number; neighbour: string; neighbourOrder: number };
        await pb.collection("slots").update(lastEdit.target_id, { sort_order: beforeData.sort_order });
        await pb.collection("slots").update(beforeData.neighbour, { sort_order: beforeData.neighbourOrder });
      }
      break;
    case "day.create":
      await pb.collection("days").delete(lastEdit.target_id);
      break;
    case "day.delete":
      if (lastEdit.before) {
        const before = lastEdit.before as Day;
        await pb.collection("days").create({
          stag:       before.stag,
          date:       before.date,
          title:      before.title,
          subtitle:   before.subtitle,
          sort_order: before.sort_order,
        });
      }
      break;
  }
  // Remove the undone edit row
  await pb.collection("edits").delete(lastEdit.id);
}
```

Need imports: `import type { Slot, Day } from "../lib/types";` if not already.

Update the Header call:

```tsx
<Header
  stag={bundle.stag}
  tripBadge={badge}
  editing={editing}
  onToggleEdit={handleToggleEdit}
  lastEdit={lastEdit}
  onUndo={editing ? handleUndo : undefined}
/>
```

- [ ] **Step 4: Manual verification**

Edit a slot title. Header shows `Last: <yourname> updated slot "<old title>" · just now · Undo`. Click Undo. Slot reverts. Verify undo also works for create, delete, reorder, day.create, day.delete.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/useEditHistory.ts web/src/components/Header.tsx web/src/pages/Stag.tsx
git commit -m "feat(web): edit history activity line and undo last change"
```

---

## Phase 8 — Presence

### Task 18: usePresence + avatar row

**Files:**
- Create: `web/src/lib/usePresence.ts`
- Create: `web/src/components/Presence.tsx`
- Modify: `web/src/components/Header.tsx`
- Modify: `web/src/pages/Stag.tsx`

- [ ] **Step 1: usePresence hook**

Path: `web/src/lib/usePresence.ts`

```typescript
import { useEffect, useState } from "react";
import { pb } from "./pb";
import type { PresenceRow } from "./types";

const SESSION_ID = Math.random().toString(36).slice(2, 12);
const HEARTBEAT_MS = 20_000;
const ACTIVE_WINDOW_MS = 60_000;

export function usePresence(stagId: string | undefined, displayName: string) {
  const [viewers, setViewers] = useState<PresenceRow[]>([]);

  useEffect(() => {
    if (!stagId || !displayName) return;
    let stopped = false;
    let unsub: (() => void) | undefined;
    let recordId: string | undefined;

    async function start() {
      // Try to find an existing row for this session
      try {
        const existing = await pb.collection("presence").getFirstListItem<PresenceRow>(
          `session_id="${SESSION_ID}"`,
        );
        recordId = existing.id;
      } catch (_) {
        const created = await pb.collection("presence").create<PresenceRow>({
          stag: stagId,
          session_id: SESSION_ID,
          display_name: displayName,
          last_seen: new Date().toISOString(),
        });
        recordId = created.id;
      }

      async function tick() {
        if (stopped || !recordId) return;
        try {
          await pb.collection("presence").update(recordId, { last_seen: new Date().toISOString() });
        } catch (_) {}
        setTimeout(tick, HEARTBEAT_MS);
      }
      tick();

      async function refresh() {
        if (stopped) return;
        const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
        const list = await pb.collection("presence").getFullList<PresenceRow>({
          filter: `stag="${stagId}" && last_seen >= "${cutoff}"`,
          sort:   "-last_seen",
        });
        setViewers(list);
        setTimeout(refresh, 10_000);
      }
      refresh();

      const u = await pb.collection("presence").subscribe<PresenceRow>("*", () => refresh());
      unsub = () => u();
    }

    start();
    return () => {
      stopped = true;
      if (unsub) unsub();
      if (recordId) pb.collection("presence").delete(recordId).catch(() => {});
    };
  }, [stagId, displayName]);

  return viewers;
}
```

- [ ] **Step 2: Presence component**

Path: `web/src/components/Presence.tsx`

```tsx
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
```

- [ ] **Step 3: Render Presence in Header**

Modify `web/src/components/Header.tsx` — import + render between `header-meta` and `undo-bar`:

```tsx
import Presence from "./Presence";
import type { PresenceRow } from "../lib/types";

interface Props {
  // ...existing
  viewers?: PresenceRow[];
}

// inside the JSX, after header-meta:
{viewers && <Presence viewers={viewers} />}
```

- [ ] **Step 4: Wire in Stag.tsx**

```tsx
import { usePresence } from "../lib/usePresence";

// inside component:
const viewers = usePresence(bundle?.stag.id, displayName);

// pass to Header:
<Header
  ...
  viewers={viewers}
/>
```

- [ ] **Step 5: Manual verification**

Open `/bcn` in two windows. Both should show 2 avatar circles within ~30 seconds. Close one window — the count should drop on the other within ~30s.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/usePresence.ts web/src/components/Presence.tsx web/src/components/Header.tsx web/src/pages/Stag.tsx
git commit -m "feat(web): presence indicator showing live viewers"
```

---

## Phase 9 — PWA + Deployment

### Task 19: Manifests and Add-to-Home-Screen

**Files:**
- Create: `web/public/manifest-bcn.webmanifest`
- Create: `web/public/manifest-sthlm.webmanifest`
- Create: `web/public/icon-bcn-192.png` (a placeholder PNG, generated below)
- Create: `web/public/icon-bcn-512.png`
- Create: `web/public/icon-sthlm-192.png`
- Create: `web/public/icon-sthlm-512.png`
- Modify: `web/index.html`
- Modify: `web/src/pages/Stag.tsx` (swap manifest link based on slug)

- [ ] **Step 1: Generate placeholder icons**

A simple approach: solid-coloured PNGs with text. Easiest is to commit two simple colored squares. Generate via PowerShell + System.Drawing:

```powershell
Add-Type -AssemblyName System.Drawing

function New-Icon($path, $hex, $size, $text) {
  $color = [System.Drawing.ColorTranslator]::FromHtml($hex)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($color)
  $font = New-Object System.Drawing.Font("Arial", ($size / 3), [System.Drawing.FontStyle]::Bold)
  $brush = [System.Drawing.Brushes]::White
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString($text, $font, $brush, (New-Object System.Drawing.RectangleF(0, 0, $size, $size)), $sf)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon "web/public/icon-bcn-192.png"  "#c84a2c" 192 "BCN"
New-Icon "web/public/icon-bcn-512.png"  "#c84a2c" 512 "BCN"
New-Icon "web/public/icon-sthlm-192.png" "#3a6ea5" 192 "STH"
New-Icon "web/public/icon-sthlm-512.png" "#3a6ea5" 512 "STH"
```

- [ ] **Step 2: Write the manifests**

Path: `web/public/manifest-bcn.webmanifest`

```json
{
  "name": "BCN Stag · June 2026",
  "short_name": "BCN Stag",
  "start_url": "./bcn",
  "scope": "./",
  "display": "standalone",
  "theme_color": "#1a1a1a",
  "background_color": "#f4ede1",
  "icons": [
    { "src": "icon-bcn-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-bcn-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Path: `web/public/manifest-sthlm.webmanifest`

```json
{
  "name": "Stockholm Stag · June 2026",
  "short_name": "STHLM Stag",
  "start_url": "./sthlm",
  "scope": "./",
  "display": "standalone",
  "theme_color": "#1a1a1a",
  "background_color": "#f4ede1",
  "icons": [
    { "src": "icon-sthlm-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-sthlm-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 3: Update index.html**

Replace `web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#1a1a1a" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,400&family=Inter+Tight:wght@400;500;600&family=Instrument+Serif&display=swap" rel="stylesheet" />
    <link id="dynamic-manifest" rel="manifest" href="manifest-bcn.webmanifest" />
    <title>Stags</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Swap manifest + apple-web-app-title from Stag.tsx**

In `Stag.tsx`, inside the `useEffect` that sets accent_color, also swap the manifest href and apple title:

```tsx
useEffect(() => {
  if (!bundle) return;
  document.documentElement.style.setProperty("--accent", bundle.stag.accent_color);
  const link = document.getElementById("dynamic-manifest") as HTMLLinkElement | null;
  if (link) link.href = `manifest-${slug}.webmanifest`;
  document.title = bundle.stag.name;
}, [bundle, slug]);
```

- [ ] **Step 5: Manual verification**

`npm run build && npm run preview`. Open the preview URL on an iPhone (or use Chrome devtools' Application → Manifest tab). Confirm:
- Manifest loaded
- Name "BCN Stag · June 2026"
- Icons present

- [ ] **Step 6: Commit**

```bash
git add web/public/ web/index.html web/src/pages/Stag.tsx
git commit -m "feat(web): per-stag manifest + icons for Add to Home Screen"
```

---

### Task 20: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy-web.yml`

- [ ] **Step 1: Write the workflow**

Path: `.github/workflows/deploy-web.yml`

```yaml
name: Deploy web

on:
  push:
    branches: [main]
    paths:
      - "web/**"
      - ".github/workflows/deploy-web.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_BASE_PATH: /stags/
          VITE_PB_URL: ${{ secrets.VITE_PB_URL }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Configure GitHub Pages and secrets**

Manual one-time setup (not code):
1. Create the GitHub repo (`stags`) and push `main`
2. Settings → Pages → Source = "GitHub Actions"
3. Settings → Secrets and variables → Actions → New repository secret:
   - `VITE_PB_URL` = the Railway URL of the PocketBase service (e.g. `https://stags-api.up.railway.app`)
4. On Railway: New Project → Deploy from GitHub repo → set root directory to `pocketbase/` → confirm it picks up the Dockerfile → enable a persistent volume mounted at `/pb/pb_data`
5. After Railway deploys, visit the public URL → `/_/` → create admin account → Collections → users → set `bcn-editor` and `sthlm-editor` passwords to the shared passphrases

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-web.yml
git commit -m "ci: GitHub Actions workflow to deploy web to Pages"
```

---

### Task 21: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Path: `README.md`

````markdown
# Stags

Interactive itinerary sites for two stag trips — Barcelona (3–7 June 2026) and Stockholm (11–14 June 2026).

## Stack

- **Web** — React + TypeScript + Vite, hosted on GitHub Pages
- **API** — PocketBase (single binary, SQLite, realtime), hosted on Railway

## Local development

### Start PocketBase

```powershell
cd pocketbase
./pocketbase.exe serve
```

Runs at `http://127.0.0.1:8090`. Open `/_/` to access the admin UI.

### Start the web app

```powershell
cd web
npm install
npm run dev
```

Runs at `http://localhost:5173`. Set `VITE_PB_URL` in `web/.env.local` to point at your PocketBase instance.

### Run tests

```powershell
cd web
npm run test
```

## Deployment

- **Web**: pushing to `main` triggers `.github/workflows/deploy-web.yml`, which builds and publishes to GitHub Pages. Set the `VITE_PB_URL` secret in repo settings.
- **API**: Railway watches the repo and rebuilds `pocketbase/Dockerfile` on push. Mount a persistent volume at `/pb/pb_data` so the SQLite file survives redeploys.

## After first deploy

1. Visit `https://<railway-url>/_/` and create the admin account
2. Collections → users → set the passphrases for `bcn-editor@stags.local` and `sthlm-editor@stags.local`
3. Share the GitHub Pages URL (`https://<user>.github.io/stags/bcn/` or `/sthlm/`) and the passphrase with the lads

## Editing the schedule

Either:
- Use the in-app edit mode (click Edit, enter passphrase)
- Or use the PocketBase admin UI directly at `/_/`
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with local dev + deployment instructions"
```

---

## Self-Review

### Spec coverage check
- ✅ Stack (React + TS + Vite, PocketBase on Railway) — Tasks 1, 2, 6
- ✅ Repo layout — File Structure section
- ✅ Schema (stags, days, slots, edits, presence) — Task 2
- ✅ API rules (public read, auth'd write) — Task 2
- ✅ Frontend data flow (fetch + subscribe + tick) — Tasks 9, 12, 13
- ✅ Time-aware behaviour (pre/in/post, NOW, dim past, T-minus) — Tasks 11, 12
- ✅ Edit UX (passphrase, modal, optimistic-ish via realtime sync) — Tasks 14, 15, 16
- ✅ Trust model (passphrase as user password) — Task 14
- ✅ Manifest / PWA — Task 19
- ✅ Seed migration with hand-ported data — Task 3
- ✅ Editor user setup — Task 4
- ✅ Deployment — Tasks 20, plus Task 20 step 2 manual notes
- ✅ Edit history + undo — Task 17
- ✅ Presence — Task 18
- ✅ Add/remove days and slots — Task 16
- ✅ Reorder slots (via ↑/↓ buttons, simpler than full drag) — Task 15

### Placeholder scan
- One intentional `FIXME(seed)` comment in Task 3's example code — explicitly called out in Step 2 of that task as the work to be done. Not a plan failure.
- No "TBD" / "TODO: implement" / "Similar to Task N" placeholders found.

### Type consistency
- `Slot.tags` is `Tag[]` (object array with `label` + `kind`) — consistent in types, EditSlotModal, Slot component, seed migration.
- `Edit.before` and `Edit.after` typed as `unknown` in types.ts, narrowed at undo time via `as Slot` / `as Day` — consistent.
- `displayName` used the same way throughout (state in Stag.tsx + localStorage key `stags.displayName`).
- Handler signatures match component prop types (`(slotId, patch)` vs `(slotId, direction)` etc.).

No issues to fix.

---

## Out of scope (deferred, captured from spec)

- Per-lad authentication
- Push notifications
- Photo uploads
- Maps / location embeds
- ICS calendar export
- Analytics
- Full drag-and-drop reorder (using ↑/↓ buttons in v1)
- Rich markdown rendering in notes (using plain text in v1; can add `**bold**` parser later)
