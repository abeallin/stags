# Testing

Two suites: **Vitest** for pure-function unit tests, **Playwright** for end-to-end browser tests against a running app.

## Quick reference

```powershell
# from web/
npm test              # 29 unit tests, no app needed (~3 s)
npm run e2e           # 10 e2e tests, requires local app running (~15 s)
npm run e2e:headed    # same, but watch the browser
npm run e2e:ui        # interactive Playwright UI
```

## Prerequisites for e2e

Playwright drives a real browser against a running app, so you need PocketBase + Vite up in two side terminals before `npm run e2e`:

```powershell
# terminal A — backend
cd pocketbase
./pocketbase.exe serve

# terminal B — frontend
cd web
npm run dev

# terminal C — tests
cd web
npm run e2e
```

The Playwright config does **not** auto-start either server — mixing port reuse, HMR, and PocketBase startup made it more brittle than helpful. One-time manual boot is the trade.

If you've never run Playwright on this machine: `npx playwright install chromium` once.

## What unit tests cover

`web/src/tests/*.test.ts` — runs in jsdom, no network.

| File | What it covers |
|---|---|
| `time.test.ts` | `determineTripState`, `findTodayDayId`, `findCurrentSlot`, `formatTMinus`, `slotStateMap` (14 cases including chrono-vs-sort-order regression) |
| `undo.test.ts` | `buildUndoOps` — all 6 edit kinds + the "no `before` snapshot" no-op edge case |
| `reorder.test.ts` | `computeSwap` — up/down/boundary/cross-day/unsorted-input cases |

These are fast and run in CI / pre-commit without needing the app.

## What e2e tests cover

`web/e2e/*.spec.ts` — runs in headless Chromium.

### `read.spec.ts` (5 tests, safe against any URL)

- Landing page renders links to both stags
- BCN page: title + T-minus badge + 5 day tabs
- Day-tab click switches the active day
- Slot title-link + website-pill have correct hrefs and `target=_blank rel=noopener`
- STHLM page: 4 day tabs + unicode-correct titles (Lilla **Gästabud**)

### `edit.spec.ts` (5 tests, local-only)

These mutate data. The suite refuses to run against `BASE_URL` that isn't localhost — a safety guard against polluting the deployed PocketBase.

- Edit-mode toggle reveals/hides slot edit icons
- Slot add → rename → delete (with cleanup)
- Move slot up — verifies the reorder propagates to the DOM
- Add day → switch to it → delete day
- Undo a rename restores the original title (uses Vivo Tapas as the canonical test target)

## Pointing tests at the deployed site

Read-only tests are safe to run against `https://abeallin.github.io/stags/`:

```powershell
$env:BASE_URL = "https://abeallin.github.io/stags/"
npx playwright test e2e/read.spec.ts
```

Edit tests will throw if you try this — by design.

## Cleanup model

Every edit test uses uniquely-named entities prefixed with `PW-` (and a timestamp). An `afterEach` hook also sweeps any leftover rows with that prefix or the default `"New slot"` / `"New day"` titles, in case a test bailed before its own cleanup. You should never need to reset the local PocketBase between runs.

If you ever do want a clean slate locally:

```powershell
cd pocketbase
Remove-Item -Recurse -Force pb_data
./pocketbase.exe serve   # migrations re-run on boot, seeded data restored
```

## What the test work caught

While writing the e2e suite a chain of real production bugs surfaced — all fixed and committed:

1. **`tags` JSON field had `maxSize: 0`** — silently blocked *every* public-API write. The seed worked because `Dao.saveRecord` bypasses validation. Fixed in migration `1748000006`.
2. **PocketBase PATCH revalidates required fields** even when they're not in the body. Sending just `{sort_order: X}` got rejected because `start_time` wasn't there. Fixed via `lib/pbDate.ts` merging required fields on every PATCH.
3. **`start_time` validator demands seconds.** Frontend was sending `"YYYY-MM-DDTHH:MM"`; PB needs `"YYYY-MM-DDTHH:MM:SS"`. `padSeconds` helper applies at every write site.
4. **Slot subscription handler wasn't re-sorting on update.** Sort-order changes hit the DB but the rendered list stayed in original order. Fixed in `useStagData`.
5. **All 40 slot `start_time` values were wiped** as collateral damage from the schema-replace trick in migration `1748000006`. Restored via `1748000007_restore_start_times.js`.

If you add a new write path to the frontend, send required fields through `withSlotRequired(patch, existing)` from `lib/pbDate.ts` to avoid #2 and #3.

## CI

Not wired up yet. Both suites pass locally in well under a minute; adding a GitHub Actions job is a one-file change when you're ready.
