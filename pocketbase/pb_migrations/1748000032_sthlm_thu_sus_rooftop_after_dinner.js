/// <reference path="../pb_data/types.d.ts" />
// Sthlm Thu 11 Jun: insert Stockholm Under Stjärnorna (SUS) — rooftop bar/park
// atop Gallerian, Hamngatan — after the Madame Thu dinner, before Pharmarium.
// Drop-in rooftop drinks with 360° views; open to midnight Thu, short walk from
// Madame Thu (both by Kungsträdgården).
//
// Current Thu order before this migration:
//   0 flight, 1 Zoey's, 2 check-in, 3 Franky's, 4 jet ski, 5 Madame Thu,
//   6 Pharmarium, 7 SoFo
// Insert SUS at sort_order 6, pushing Pharmarium → 7 and SoFo → 8.
//
// Idempotent: skips if a slot titled "Stockholm Under Stjärnorna" already exists.

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
    console.log("[1748000032] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  if (findSlotByTitle(dao, thu.id, "Stockholm Under Stjärnorna")) {
    console.log("[1748000032] already inserted, skipping");
    return;
  }

  shiftSortOrders(dao, thu.id, 6);

  const col = dao.findCollectionByNameOrId("slots");
  const sus = new Record(col, {
    day:         thu.id,
    start_time:  "2026-06-11T21:30:00",
    time_label:  "9:30pm · rooftop drinks",
    title:       "Stockholm Under Stjärnorna",
    note:        "SUS — a 1,200 sqm rooftop park 50m above Gallerian (Hamngatan), three bars, DJs and 360° views over the rooftops and out to Lake Mälaren. Short walk from Madame Thu — both sit by Kungsträdgården. In late June the sun is barely down at 9:30, so it's golden light over the city, not actual stars. Drop-in, first come, first served; open to midnight Thursday.\n\nA rooftop drink to open the night before dropping down to Pharmarium for cocktails.",
    tags:        [{ label: "Gallerian rooftop · ~5 min", kind: "walk" }, { label: "Drop-in", kind: "info" }],
    is_featured: true,
    sort_order:  6,
    map_url:     mapsSearchUrl("Stockholm Under Stjärnorna Gallerian Hamngatan"),
    website_url: "https://www.sthlmunderstjarnorna.com/",
  });
  dao.saveRecord(sus);

  console.log("[1748000032] inserted Stockholm Under Stjärnorna at Thu ~21:30");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  const slot = findSlotByTitle(dao, thu.id, "Stockholm Under Stjärnorna");
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
