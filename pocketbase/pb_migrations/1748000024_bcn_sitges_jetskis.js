/// <reference path="../pb_data/types.d.ts" />
// BCN Sat 6 Jun (Sitges day trip): nobody wanted the cava sail — swap the
// 3:30pm "Sitges sail with cava" slot → jet skis along the coast. Keeps the
// same window before the 6:30pm train back. No-licence rentals on the town
// beach (Aguadoo, walkable from lunch) or out at Port d'Aiguadolç.
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
    console.log("[1748000024_bcn_sitges_jetskis] bcn stag not found, skipping");
    return;
  }

  const sat = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-06" });

  swapSlot(dao, sat.id, "Sitges sail with cava", {
    start_time:  "2026-06-06T15:30:00",
    time_label:  "3:30pm · jet skis",
    title:       "Jet skis along the coast",
    note:        "★ ~1hr blasting the Sitges coast — coves, cliffs, clear water. No licence needed, 18+; two can share a ski and swap driving. Wetsuit and life jacket provided; bring your passport/ID and expect a refundable ~€100 deposit per ski. Roughly €50/hr per ski.\n\nBook ahead — Saturdays in June fill fast. Aguadoo runs no-licence skis (plus banana boat/donut if anyone bottles the solo ride) straight off the town beach, a few minutes from lunch; the Port d'Aiguadolç marina operator is the other option, ~10 min taxi east. Back dry and changed for the 6:30 train.",
    tags:        [
      { label: "Book ahead", kind: "book" },
      { label: "No licence · 18+ · bring ID", kind: "info" },
    ],
    is_featured: true,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" +
                 encodeURIComponent("Sitges beach jet ski water sports"),
    website_url: "https://www.aguadoo.com/watersports-sitges/",
  });

  console.log("[1748000024_bcn_sitges_jetskis] Sitges sail with cava → Jet skis along the coast");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); } catch (_) { return; }

  const sat = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-06" });

  swapSlot(dao, sat.id, "Jet skis along the coast", {
    start_time:  "2026-06-06T15:30:00",
    time_label:  "3:30pm · sailing tour",
    title:       "Sitges sail with cava",
    note:        "~1.5–2hrs, ~€30–50pp. Sail along the Sitges coast with cava. Book Wed/Thu on GetYourGuide — Saturdays in June sell out.",
    tags:        [{ kind: "must", label: "Book ahead" }],
    is_featured: true,
    map_url:     "",
    website_url: "",
  });
});
