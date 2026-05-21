/// <reference path="../pb_data/types.d.ts" />
// Restore slot.start_time values after they were wiped by the schema-replace
// trick in 1748000006_fix_json_maxsize.js. Pulls values from the original
// seed (1748000001_seed_from_html.js). Skips slots that already have a
// non-empty value — idempotent on re-run.

const SLOT_STARTS = [
  {"stag":"bcn","date":"2026-06-03","title":"Land at BCN \u2192 apartment","start_time":"2026-06-03T16:15"},
  {"stag":"bcn","date":"2026-06-03","title":"Vivo Tapas","start_time":"2026-06-03T20:00"},
  {"stag":"bcn","date":"2026-06-03","title":"Paradiso speakeasy","start_time":"2026-06-03T22:00"},
  {"stag":"bcn","date":"2026-06-04","title":"Ripa Coffee + Passeig de Gr\u00e0cia stroll","start_time":"2026-06-04T11:00"},
  {"stag":"bcn","date":"2026-06-04","title":"Cervecer\u00eda Catalana","start_time":"2026-06-04T13:00"},
  {"stag":"bcn","date":"2026-06-04","title":"Primavera Sound at Parc del F\u00f2rum","start_time":"2026-06-04T17:30"},
  {"stag":"bcn","date":"2026-06-05","title":"Faire. Brunch & Drinks","start_time":"2026-06-05T12:00"},
  {"stag":"bcn","date":"2026-06-05","title":"Barceloneta beach","start_time":"2026-06-05T14:00"},
  {"stag":"bcn","date":"2026-06-05","title":"Xiringuito Escrib\u00e0","start_time":"2026-06-05T20:30"},
  {"stag":"bcn","date":"2026-06-05","title":"El Born cocktail crawl (if game)","start_time":"2026-06-05T23:00"},
  {"stag":"bcn","date":"2026-06-06","title":"R2 Sud \u2192 Sitges","start_time":"2026-06-06T10:30"},
  {"stag":"bcn","date":"2026-06-06","title":"San Sebasti\u00e1n beach","start_time":"2026-06-06T12:00"},
  {"stag":"bcn","date":"2026-06-06","title":"Beachfront chiringuito","start_time":"2026-06-06T13:30"},
  {"stag":"bcn","date":"2026-06-06","title":"Sitges sail with cava","start_time":"2026-06-06T15:30"},
  {"stag":"bcn","date":"2026-06-06","title":"R2 Sud \u2192 Passeig de Gr\u00e0cia","start_time":"2026-06-06T18:30"},
  {"stag":"bcn","date":"2026-06-06","title":"Bar Ca\u00f1ete","start_time":"2026-06-06T21:30"},
  {"stag":"bcn","date":"2026-06-06","title":"El Born cocktails \u2192 Opium","start_time":"2026-06-07T00:00"},
  {"stag":"bcn","date":"2026-06-07","title":"Pack + bags down","start_time":"2026-06-07T09:00"},
  {"stag":"bcn","date":"2026-06-07","title":"Faire or Ripa \u00b7 coffee + croissant","start_time":"2026-06-07T10:00"},
  {"stag":"bcn","date":"2026-06-07","title":"Aerob\u00fas from Pla\u00e7a Catalunya","start_time":"2026-06-07T11:00"},
  {"stag":"sthlm","date":"2026-06-11","title":"Heathrow \u2192 Stockholm Arlanda","start_time":"2026-06-11T09:00"},
  {"stag":"sthlm","date":"2026-06-11","title":"Scandic check-in \u2192 Old Town stroll","start_time":"2026-06-11T15:00"},
  {"stag":"sthlm","date":"2026-06-11","title":"Lilla G\u00e4stabud","start_time":"2026-06-11T19:30"},
  {"stag":"sthlm","date":"2026-06-11","title":"Pharmarium","start_time":"2026-06-11T22:00"},
  {"stag":"sthlm","date":"2026-06-12","title":"Caf\u00e9 Pascal","start_time":"2026-06-12T09:00"},
  {"stag":"sthlm","date":"2026-06-12","title":"Vasa Museum on Djurg\u00e5rden","start_time":"2026-06-12T10:30"},
  {"stag":"sthlm","date":"2026-06-12","title":"Sthlm Sauna Vinterviken","start_time":"2026-06-12T14:30"},
  {"stag":"sthlm","date":"2026-06-12","title":"Punk Royale","start_time":"2026-06-12T20:00"},
  {"stag":"sthlm","date":"2026-06-12","title":"Othilia","start_time":"2026-06-12T23:00"},
  {"stag":"sthlm","date":"2026-06-12","title":"Tr\u00e4dg\u00e5rden","start_time":"2026-06-13T01:00"},
  {"stag":"sthlm","date":"2026-06-13","title":"Royal Golden Wedding day","start_time":"2026-06-13T08:00"},
  {"stag":"sthlm","date":"2026-06-13","title":"Hotel breakfast or Komet Caf\u00e9","start_time":"2026-06-13T10:00"},
  {"stag":"sthlm","date":"2026-06-13","title":"Stockholm Archipelago Summer Ride","start_time":"2026-06-13T12:00"},
  {"stag":"sthlm","date":"2026-06-13","title":"Mad Axe Throwing Club","start_time":"2026-06-13T15:30"},
  {"stag":"sthlm","date":"2026-06-13","title":"Adam/Albin","start_time":"2026-06-13T20:00"},
  {"stag":"sthlm","date":"2026-06-13","title":"Bar Lilla Compagniet \u2192 Tr\u00e4dg\u00e5rden","start_time":"2026-06-13T23:30"},
  {"stag":"sthlm","date":"2026-06-14","title":"Hotel breakfast + pack","start_time":"2026-06-14T10:00"},
  {"stag":"sthlm","date":"2026-06-14","title":"Lunch at Caf\u00e9 Pascal or Komet","start_time":"2026-06-14T12:00"},
  {"stag":"sthlm","date":"2026-06-14","title":"Arlanda Express","start_time":"2026-06-14T14:00"},
];

function padSeconds(iso) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso) ? iso + ":00" : iso;
}

migrate((db) => {
  const dao = new Dao(db);
  let updated = 0;
  for (const row of SLOT_STARTS) {
    let stag;
    try { stag = dao.findFirstRecordByData("stags", "slug", row.stag); }
    catch (_) { continue; }

    let day;
    try {
      day = dao.findFirstRecordByFilter("days",
        "stag = {:stag} && date ~ {:date}",
        { stag: stag.id, date: row.date });
    } catch (_) { continue; }

    let slot;
    try {
      slot = dao.findFirstRecordByFilter("slots",
        "day = {:day} && title = {:title}",
        { day: day.id, title: row.title });
    } catch (_) { continue; }

    const current = slot.get("start_time");
    if (current && String(current).length > 0) continue;  // already set, skip

    slot.set("start_time", padSeconds(row.start_time));
    dao.saveRecord(slot);
    updated++;
  }
  console.log("[1748000007_restore_start_times] restored " + updated + " slot start_times");
}, (db) => {
  // No-op
});
