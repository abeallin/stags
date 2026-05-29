/// <reference path="../pb_data/types.d.ts" />
// Barcelona: insert pre-dinner rooftop drinks at The Rooftop at Sir Victor on
// the arrival night (Wed 3 Jun), at 6:45pm — between landing/apartment (4:15pm)
// and Vivo Tapas dinner (8:00pm).
//
// Existing Wed order: 0 arrival, 1 Vivo Tapas, 2 Paradiso.
// After insert at sort_order 1: Vivo→2, Paradiso→3, Sir Victor at 1.
//
// Idempotent: existence-checks the insert by (day, title).

const BCN = "bcn";

function mapsSearchUrl(query) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

function findStag(dao, slug) {
  return dao.findFirstRecordByData("stags", "slug", slug);
}

function findDay(dao, stagId, date) {
  return dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stagId, date: date });
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

function insertSlot(dao, dayId, sortOrder, data) {
  if (findSlotByTitle(dao, dayId, data.title)) return false;
  shiftSortOrders(dao, dayId, sortOrder);
  const col = dao.findCollectionByNameOrId("slots");
  const rec = new Record(col, {
    day:          dayId,
    start_time:   data.start_time,
    time_label:   data.time_label,
    title:        data.title,
    note:         data.note,
    tags:         data.tags || [],
    is_featured:  !!data.is_featured,
    sort_order:   sortOrder,
    map_url:      data.map_url || "",
    website_url:  data.website_url || "",
  });
  dao.saveRecord(rec);
  return true;
}

function deleteByTitle(dao, dayId, title) {
  const slot = findSlotByTitle(dao, dayId, title);
  if (!slot) return;
  const removedOrder = slot.get("sort_order");
  dao.deleteRecord(slot);
  const above = dao.findRecordsByFilter("slots",
    "day = {:day} && sort_order > {:t}",
    "sort_order",
    200, 0,
    { day: dayId, t: removedOrder });
  for (const s of above) {
    s.set("sort_order", s.get("sort_order") - 1);
    dao.saveRecord(s);
  }
}

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = findStag(dao, BCN); }
  catch (_) {
    console.log("[1748000012_bcn_sir_victor] bcn stag not found, skipping");
    return;
  }

  const wed = findDay(dao, stag.id, "2026-06-03");

  insertSlot(dao, wed.id, 1, {
    start_time:  "2026-06-03T18:45:00",
    time_label:  "6:45pm · rooftop aperitivo",
    title:       "The Rooftop at Sir Victor",
    note:        "★ Pre-dinner drinks on the Sir Victor rooftop — wooden deck, glittering pool, sleek bar and Mediterranean small plates, with Gaudí's La Pedrera one block away and the Sagrada Família spires in the distance. Creative cocktails and organic wines. The ideal way to ease into the trip after landing, before strolling down to Vivo Tapas.\n\nIt's a hotel rooftop and fills up at golden hour — worth booking a table, or get there early for the loungers. Carrer del Rosselló 265, top of Passeig de Gràcia.",
    tags:        [{ label: "Passeig de Gràcia", kind: "walk" }, { label: "Book a table", kind: "must" }],
    is_featured: true,
    map_url:     mapsSearchUrl("The Rooftop at Sir Victor Barcelona"),
    website_url: "https://www.sirhotels.com/en/victor/rooftop/",
  });

  console.log("[1748000012_bcn_sir_victor] Sir Victor rooftop inserted");
}, (db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = findStag(dao, BCN); } catch (_) { return; }

  const wed = findDay(dao, stag.id, "2026-06-03");
  deleteByTitle(dao, wed.id, "The Rooftop at Sir Victor");
});
