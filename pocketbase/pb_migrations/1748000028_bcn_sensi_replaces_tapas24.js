/// <reference path="../pb_data/types.d.ts" />
// BCN Fri 5 Jun: swap the 7pm pre-club dinner Tapas 24 → Colección by Sensi
// (Carrer del Regomir 16, Gothic Quarter). Keeps the same 7pm slot and the
// "out by ~8:45, taxi to Poble Español for La Terrrazza at 9pm" flow.
//
// Idempotent: matches by old title and bails once swapped.

function findSlotByTitle(dao, dayId, title) {
  try {
    return dao.findFirstRecordByFilter("slots",
      "day = {:day} && title = {:title}",
      { day: dayId, title: title });
  } catch (_) { return null; }
}

function swapSlot(dao, dayId, oldTitle, data) {
  const slot = findSlotByTitle(dao, dayId, oldTitle);
  if (!slot) return false;
  slot.set("start_time",  data.start_time);
  slot.set("time_label",  data.time_label);
  slot.set("title",       data.title);
  slot.set("note",        data.note);
  slot.set("tags",        data.tags || []);
  if (typeof data.is_featured === "boolean") slot.set("is_featured", data.is_featured);
  slot.set("map_url",     data.map_url || "");
  slot.set("website_url", data.website_url || "");
  dao.saveRecord(slot);
  return true;
}

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); }
  catch (_) {
    console.log("[1748000028_bcn_sensi_replaces_tapas24] bcn stag not found, skipping");
    return;
  }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-05" });

  swapSlot(dao, fri.id, "Tapas 24", {
    start_time:  "2026-06-05T19:00:00",
    time_label:  "7:00pm · pre-club dinner",
    title:       "Colección by Sensi",
    note:        "Cosy Art Deco tapas hideaway at Carrer del Regomir 16, tucked into the Gothic Quarter — low light, greenery, the kind of room that feels like a find. Modern takes alongside the classics: croquettes, patatas bravas, Iberian ham, grilled octopus, organic padrón peppers, a pulled-pork bao, crispy wings, plus solid veggie/vegan options. Strong natural-wine list and proper cocktails.\n\nBook a group of 7 for 7pm and we're out by ~8:45pm to cab up to Poble Español for La Terrrazza at 9pm. Budget ~€45–65pp food + drinks. Book ahead — Fridays fill.\n\nBackup if Sensi is booked: Llamber (El Born, modern tapas) or El Nacional (Passeig de Gràcia food hall, walk-in friendly for groups).",
    tags:        [
      { label: "Regomir 16 · short taxi", kind: "taxi" },
      { label: "Book ahead", kind: "must" },
    ],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" +
                 encodeURIComponent("Colección by Sensi Barcelona"),
    website_url: "https://sensi.es/coleccion/",
  });

  console.log("[1748000028_bcn_sensi_replaces_tapas24] Tapas 24 → Colección by Sensi");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); } catch (_) { return; }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-05" });

  swapSlot(dao, fri.id, "Colección by Sensi", {
    start_time:  "2026-06-05T19:00:00",
    time_label:  "7:00pm · pre-club dinner",
    title:       "Tapas 24",
    note:        "Carles Abellán's modern-tapas bar at Diputació 269 — Abellán came up through elBulli and runs the most consistently elevated version of classic Spanish tapas in town. Bikini de trufa, patatas bravas, McFoie burger, Russian salad, the proper crispy bombs. Lively counter + tables, fast turn — book a group of 7 for 7pm and we're out the door by ~8:45pm in time to cab up to Poble Español for La Terrrazza at 9pm.\n\nBudget ~€55–75pp food + drinks. Book ahead — Fridays fill.\n\nBackup if Tapas 24 is booked: Llamber (El Born, modern tapas) or El Nacional (Passeig de Gràcia food hall, multi-concept, walk-in friendly for groups).",
    tags:        [
      { kind: "taxi", label: "Diputació 269 · short taxi" },
      { kind: "must", label: "Book ahead" },
    ],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=Tapas%2024%20Diputaci%C3%B3%20Barcelona",
    website_url: "https://www.carlesabellan.com/restaurants/tapas-24/",
  });
});
