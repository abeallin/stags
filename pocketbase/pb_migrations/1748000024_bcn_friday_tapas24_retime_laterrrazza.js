/// <reference path="../pb_data/types.d.ts" />
// BCN Fri 5 Jun retime + dinner upgrade for the La Terrrazza 9pm-12 window:
//
//   1. Replace Xiringuito Escribà (8:30pm seafront paella) with Tapas 24
//      (Carles Abellán's elevated modern tapas, Diputació 269, Eixample) at
//      7pm — books a group of 7, faster than a tasting menu, properly a
//      quality jump over the standard beachfront paella.
//
//   2. Retime La Terrrazza from 11pm → 9pm to match the user's stated
//      window (9pm doors, bail by midnight before Sat's R2 Sud at 10:30am).
//
// Idempotent: both swaps match by current title and bail once moved.

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
    console.log("[1748000024_bcn_friday_tapas24_retime_laterrrazza] bcn stag not found, skipping");
    return;
  }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-05" });

  // 1) Xiringuito Escribà → Tapas 24
  swapSlot(dao, fri.id, "Xiringuito Escribà", {
    start_time:  "2026-06-05T19:00:00",
    time_label:  "7:00pm · pre-club dinner",
    title:       "Tapas 24",
    note:        "Carles Abellán's modern-tapas bar at Diputació 269 — Abellán came up through elBulli and runs the most consistently elevated version of classic Spanish tapas in town. Bikini de trufa, patatas bravas, McFoie burger, Russian salad, the proper crispy bombs. Lively counter + tables, fast turn — book a group of 7 for 7pm and we're out the door by ~8:45pm in time to cab up to Poble Español for La Terrrazza at 9pm.\n\nBudget ~€55–75pp food + drinks. Book ahead — Fridays fill.\n\nBackup if Tapas 24 is booked: Llamber (El Born, modern tapas) or El Nacional (Passeig de Gràcia food hall, multi-concept, walk-in friendly for groups).",
    tags:        [{ label: "Diputació 269 · short taxi", kind: "taxi" }, { label: "Book ahead", kind: "must" }],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" +
                 encodeURIComponent("Tapas 24 Diputació Barcelona"),
    website_url: "https://www.carlesabellan.com/restaurants/tapas-24/",
  });

  // 2) Retime La Terrrazza 11pm → 9pm
  const lt = findSlotByTitle(dao, fri.id, "La Terrrazza");
  if (lt && lt.get("start_time") !== "2026-06-05T21:00:00") {
    lt.set("start_time", "2026-06-05T21:00:00");
    lt.set("time_label", "9:00pm → midnight · open-air club");
    lt.set("note",
      "Barcelona's only proper open-air club, set inside Poble Español up on Montjuïc — walled-village setting, sky overhead. Friday 5 June bill: CLOSA SELECTS: Tripolism (Tripolism + Denoir, melodic house / techno). Doors from 7pm; we go in at 9pm and bail by midnight to be fresh for Saturday's 10:30am R2 Sud to Sitges. 18+.\n\nGrab Fever tickets ahead — the link the group has is a specific 5 Jun session. Taxi from Tapas 24 to Poble Español is ~15 min. Dress isn't strict but it's a club crowd."
    );
    dao.saveRecord(lt);
  }

  console.log("[1748000024_bcn_friday_tapas24_retime_laterrrazza] Tapas 24 + La Terrrazza retimed");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); } catch (_) { return; }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-05" });

  // Restore Xiringuito Escribà
  swapSlot(dao, fri.id, "Tapas 24", {
    start_time:  "2026-06-05T20:30:00",
    time_label:  "8:30pm · paella dinner",
    title:       "Xiringuito Escribà",
    note:        "Beachfront paella, ~10 min walk up the seafront from Barceloneta. Reservation essential for 8.",
    tags:        [{ label: "10 min along beach", kind: "walk" }, { label: "Book ahead", kind: "must" }],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" +
                 encodeURIComponent("Xiringuito Escribà Barceloneta"),
    website_url: "https://restaurantsescriba.com/",
  });

  // Restore La Terrrazza 11pm
  const lt = findSlotByTitle(dao, fri.id, "La Terrrazza");
  if (lt) {
    lt.set("start_time", "2026-06-05T23:00:00");
    lt.set("time_label", "11:00pm · open-air club");
    lt.set("note",
      "Barcelona's only proper open-air club, set inside Poble Español up on Montjuïc — walled-village setting, sky overhead. Friday 5 June bill: CLOSA SELECTS: Tripolism (Tripolism + Denoir, melodic house / techno). Doors 7pm, runs late, 18+.\n\nGrab Fever tickets ahead — the link the group has is a specific 5 Jun session. Taxi from Barceloneta after Xiringuito Escribà is ~15 min. Dress isn't strict but it's a club crowd, not the beach kit.\n\nIf the group's wiped after Primavera + paella, this is the easy skip — \"two of us are going, see you Sitges-morning.\" Saturday's an early train south so don't kill yourself."
    );
    dao.saveRecord(lt);
  }
});
