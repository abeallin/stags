/// <reference path="../pb_data/types.d.ts" />
// Sthlm Thu 11 Jun: insert RIB Stockholm speedboat tour at 16:30, between the
// 15:00 Scandic check-in and the 19:30 Madame Thu dinner. 1hr Old Town +
// inner archipelago loop, leaves from Strömkajen — 5 min walk from hotel.
//
// Idempotent: skips if a slot titled "RIB Stockholm" already exists on the day.

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
    console.log("[1748000011_sthlm_rib_thursday] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  if (findSlotByTitle(dao, thu.id, "RIB Stockholm")) {
    console.log("[1748000011_sthlm_rib_thursday] already inserted, skipping");
    return;
  }

  // Current Thu order after 1748000010:
  // 0 flight, 1 TRIBOWL, 2 check-in, 3 Madame Thu, 4 Pharmarium
  // Insert RIB at 3, push Madame Thu→4, Pharmarium→5.
  shiftSortOrders(dao, thu.id, 3);

  const col = dao.findCollectionByNameOrId("slots");
  const rib = new Record(col, {
    day:          thu.id,
    start_time:   "2026-06-11T16:30:00",
    time_label:   "4:30pm · speedboat",
    title:        "RIB Stockholm",
    note:         "1hr rigid-inflatable speedboat loop — Old Town waterfront + inner archipelago. Leaves from Strömkajen (5 min walk from hotel). Proper way to see Stockholm: low and fast through the islands while everyone else is on the slow commentary boats.\n\nBring a jumper — it's open-top and the wind off the water is real even in June. Back by ~6pm, shower at the hotel, dinner at Madame Thu at 7:30. Book ahead — summer slots vanish.",
    tags:        [{ label: "Strömkajen · 5 min", kind: "walk" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    sort_order:  3,
    map_url:     mapsSearchUrl("RIB Stockholm Strömkajen"),
    website_url: "",
  });
  dao.saveRecord(rib);

  console.log("[1748000011_sthlm_rib_thursday] inserted RIB Stockholm at Thu 16:30");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  const slot = findSlotByTitle(dao, thu.id, "RIB Stockholm");
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
