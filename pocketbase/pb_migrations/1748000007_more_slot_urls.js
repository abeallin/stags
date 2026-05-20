/// <reference path="../pb_data/types.d.ts" />
// Fills in URLs for the slots the original backfill skipped: festival, beaches,
// the R2 Sud train both ways, the Aerobús, the Arlanda Express, and the
// fallback "Faire or Ripa" breakfast (reuses Faire's CID). Logistics-only slots
// (Pack bags, Land at BCN, flights) and multi-venue suggestions
// (El Born cocktail crawl, Beachfront chiringuito) are intentionally left blank.
//
// Idempotent: skips rows whose URL fields already match. Same `date ~ {:date}`
// prefix-match the previous backfill uses.

const SLOT_URLS = [
  {"stag":"bcn",  "date":"2026-06-04","title":"Primavera Sound at Parc del Fòrum",     "map_url":"https://maps.google.com/?q=Parc+del+F%C3%B2rum+Barcelona",                "website_url":"https://www.primaverasound.com/en"},
  {"stag":"bcn",  "date":"2026-06-05","title":"Barceloneta beach",                          "map_url":"https://maps.google.com/?q=Barceloneta+Beach+Barcelona",                 "website_url":null},
  {"stag":"bcn",  "date":"2026-06-06","title":"R2 Sud → Sitges",                       "map_url":"https://maps.google.com/?q=Passeig+de+Gr%C3%A0cia+station+Barcelona",    "website_url":"https://rodalies.gencat.cat/en"},
  {"stag":"bcn",  "date":"2026-06-06","title":"San Sebastián beach",                   "map_url":"https://maps.google.com/?q=Platja+de+Sant+Sebasti%C3%A0+Sitges",          "website_url":null},
  {"stag":"bcn",  "date":"2026-06-06","title":"R2 Sud → Passeig de Gràcia",        "map_url":"https://maps.google.com/?q=Sitges+train+station",                       "website_url":"https://rodalies.gencat.cat/en"},
  {"stag":"bcn",  "date":"2026-06-07","title":"Faire or Ripa · coffee + croissant",    "map_url":"https://maps.google.com/?cid=13909965794466410091",                      "website_url":null},
  {"stag":"bcn",  "date":"2026-06-07","title":"Aerobús from Plaça Catalunya",     "map_url":"https://maps.google.com/?q=Aerob%C3%BAs+Pla%C3%A7a+Catalunya+Barcelona",  "website_url":"https://www.aerobusbcn.com/en/"},
  {"stag":"sthlm","date":"2026-06-14","title":"Arlanda Express",                            "map_url":"https://maps.google.com/?q=Stockholm+Central+Station",                   "website_url":"https://www.arlandaexpress.com/en"},
];

migrate((db) => {
  const dao = new Dao(db);
  let updated = 0;
  for (const row of SLOT_URLS) {
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

    let dirty = false;
    if (row.map_url && slot.get("map_url") !== row.map_url) {
      slot.set("map_url", row.map_url);
      dirty = true;
    }
    if (row.website_url && slot.get("website_url") !== row.website_url) {
      slot.set("website_url", row.website_url);
      dirty = true;
    }
    if (dirty) {
      dao.saveRecord(slot);
      updated++;
    }
  }
  console.log("[1748000007_more_slot_urls] backfilled " + updated + " slots");
}, (db) => {
  // No-op: leave URLs in place on rollback.
});
