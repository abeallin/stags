/// <reference path="../pb_data/types.d.ts" />
// Sthlm Thu 11 Jun: insert Franky's Burger (Tegnérgatan 16, Vasastan) right
// after the 3pm hotel check-in, ~3:15pm — a quick post-arrival burger before
// the 3:30pm jet ski safari. ~6 min walk from the hotel, open to 21:00 Thu.
//
// Current Thu order before this migration:
//   0 flight, 1 Zoey's, 2 check-in, 3 jet ski, 4 Madame Thu, 5 Pharmarium, 6 SoFo
// Insert Franky's at sort_order 3, pushing jet ski → 4 and everything after +1.
//
// Idempotent: skips if a slot titled "Franky's Burger" already exists on the day.

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
    console.log("[1748000031] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  if (findSlotByTitle(dao, thu.id, "Franky's Burger")) {
    console.log("[1748000031] already inserted, skipping");
    return;
  }

  shiftSortOrders(dao, thu.id, 3);

  const col = dao.findCollectionByNameOrId("slots");
  const frankys = new Record(col, {
    day:         thu.id,
    start_time:  "2026-06-11T15:15:00",
    time_label:  "3:15pm · quick burger",
    title:       "Franky's Burger",
    note:        "Tegnérgatan 16, Vasastan — ~6 min walk from the hotel. Stockholm burger institution, 20+ years deep. Drop the bags at check-in, then grab a fast burger here before the 3:30 jet ski. Counter-style and quick; order on arrival (or ahead) so it doesn't eat into the boat slot. Open to 21:00 Thursday if the timing slips.",
    tags:        [{ label: "Tegnérgatan 16 · ~6 min", kind: "walk" }],
    is_featured: false,
    sort_order:  3,
    map_url:     mapsSearchUrl("Franky's Burger Tegnérgatan 16 Stockholm"),
    website_url: "https://www.frankysburger.se/",
  });
  dao.saveRecord(frankys);

  console.log("[1748000031] inserted Franky's Burger at Thu ~15:15");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  const slot = findSlotByTitle(dao, thu.id, "Franky's Burger");
  if (!slot) return;
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
});
