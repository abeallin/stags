/// <reference path="../pb_data/types.d.ts" />
// Sthlm Thu 11 Jun: remove the Pharmarium cocktail slot. After SUS rooftop the
// night runs dinner → SUS → SoFo bar crawl, no Pharmarium stop.
//
// Current Thu order before this migration:
//   ... 5 Madame Thu, 6 SUS, 7 Pharmarium, 8 SoFo
// Delete Pharmarium (7) and pull SoFo back up to 7.
//
// Idempotent: skips if Pharmarium is already gone. Down re-inserts it at 22:00
// between SUS and SoFo.

const STHLM = "sthlm";

function mapsSearchUrl(query) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

function findSlotByTitle(dao, dayId, title) {
  try {
    return dao.findFirstRecordByFilter("slots",
      "day = {:day} && title = {:title}",
      { day: dayId, title: title });
  } catch (_) { return null; }
}

function shiftSortOrders(dao, dayId, threshold) {
  const slots = dao.findRecordsByFilter("slots",
    "day = {:day} && sort_order >= {:t}",
    "-sort_order",
    200, 0,
    { day: dayId, t: threshold });
  for (const s of slots) {
    s.set("sort_order", s.get("sort_order") + 1);
    dao.saveRecord(s);
  }
}

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); }
  catch (_) {
    console.log("[1748000033] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  const slot = findSlotByTitle(dao, thu.id, "Pharmarium");
  if (!slot) {
    console.log("[1748000033] Pharmarium already removed, skipping");
    return;
  }

  const removedOrder = slot.get("sort_order");
  dao.deleteRecord(slot);

  const above = dao.findRecordsByFilter("slots",
    "day = {:day} && sort_order > {:t}",
    "sort_order",
    200, 0,
    { day: thu.id, t: removedOrder });
  for (const s of above) {
    s.set("sort_order", s.get("sort_order") - 1);
    dao.saveRecord(s);
  }

  console.log("[1748000033] removed Pharmarium from Thu");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  if (findSlotByTitle(dao, thu.id, "Pharmarium")) return;

  shiftSortOrders(dao, thu.id, 7);

  const col = dao.findCollectionByNameOrId("slots");
  const pharmarium = new Record(col, {
    day:         thu.id,
    start_time:  "2026-06-11T22:00:00",
    time_label:  "10:00pm · cocktails",
    title:       "Pharmarium",
    note:        "★ 4.4 · 1,600 reviews. Theatrical apothecary-themed cocktail bar on Stortorget square. Smoke, potions, all the bits. Expensive but a proper experience.",
    tags:        [{ label: "Gamla Stan · 20 min", kind: "walk" }],
    is_featured: false,
    sort_order:  7,
    map_url:     mapsSearchUrl("Pharmarium Stockholm"),
    website_url: "",
  });
  dao.saveRecord(pharmarium);
});
