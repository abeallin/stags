/// <reference path="../pb_data/types.d.ts" />
// Sthlm tag fixes: walking-distance tags that were calibrated against Scandic
// Continental (next to Central) need recomputing from Scandic Upplandsgatan
// (Upplandsgatan 4, Vasastan/Norrmalm border).
//
// Updates 5 slots' tags + the RIB Stockholm note's "5 min walk from hotel"
// line. Idempotent: matches each slot by title and overwrites the fields.

const STHLM = "sthlm";

function findSlotByTitle(dao, dayId, title) {
  try {
    return dao.findFirstRecordByFilter("slots",
      "day = {:day} && title = {:title}",
      { day: dayId, title: title });
  } catch (_) { return null; }
}

function setTags(dao, dayId, title, tags) {
  const slot = findSlotByTitle(dao, dayId, title);
  if (!slot) return false;
  slot.set("tags", tags);
  dao.saveRecord(slot);
  return true;
}

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); }
  catch (_) {
    console.log("[1748000014_sthlm_walk_distances] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });
  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-12" });

  // Thu: RIB Stockholm — was "Strömkajen · 5 min" walk, now ~8 min taxi.
  setTags(dao, thu.id, "RIB Stockholm", [
    { label: "Strömkajen · 8 min", kind: "taxi" },
    { label: "Book ahead",         kind: "must" },
  ]);
  // Patch the RIB note's "(5 min walk from hotel)" line.
  const rib = findSlotByTitle(dao, thu.id, "RIB Stockholm");
  if (rib) {
    rib.set("note",
      "1hr rigid-inflatable speedboat loop — Old Town waterfront + inner archipelago. Leaves from Strömkajen (quick taxi from the hotel — Upplandsgatan to Strömkajen is ~8 min). Proper way to see Stockholm: low and fast through the islands while everyone else is on the slow commentary boats.\n\nBring a jumper — it's open-top and the wind off the water is real even in June. Back by ~6pm, taxi to the hotel, shower, dinner at Madame Thu at 7:30. Book ahead — summer slots vanish."
    );
    dao.saveRecord(rib);
  }

  // Thu: Madame Thu — was "Kungsträdgården · 5 min" walk, now ~15 min walk.
  setTags(dao, thu.id, "Madame Thu", [
    { label: "Kungsträdgården · 15 min", kind: "walk" },
    { label: "Book ahead",                kind: "must" },
  ]);

  // Thu: Pharmarium — was "Gamla Stan" (implicit close), now ~20 min walk.
  setTags(dao, thu.id, "Pharmarium", [
    { label: "Gamla Stan · 20 min", kind: "walk" },
  ]);

  // Fri: Café Pascal — was "10 min walk", now ~5 min from Upplandsgatan.
  setTags(dao, fri.id, "Café Pascal", [
    { label: "5 min walk", kind: "walk" },
  ]);

  // Fri: Premium Grill Odenplan — was "Odenplan · 15 min" taxi, walkable in 15.
  setTags(dao, fri.id, "Premium Grill Odenplan", [
    { label: "Odenplan · 15 min", kind: "walk" },
    { label: "Book ahead",        kind: "must" },
  ]);

  console.log("[1748000014_sthlm_walk_distances] 5 slots' tags + RIB note updated");
}, (db) => {
  // Down: restore previous tag values + RIB note line.
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });
  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-12" });

  setTags(dao, thu.id, "RIB Stockholm", [
    { label: "Strömkajen · 5 min", kind: "walk" },
    { label: "Book ahead",         kind: "must" },
  ]);
  const rib = findSlotByTitle(dao, thu.id, "RIB Stockholm");
  if (rib) {
    rib.set("note",
      "1hr rigid-inflatable speedboat loop — Old Town waterfront + inner archipelago. Leaves from Strömkajen (5 min walk from hotel). Proper way to see Stockholm: low and fast through the islands while everyone else is on the slow commentary boats.\n\nBring a jumper — it's open-top and the wind off the water is real even in June. Back by ~6pm, shower at the hotel, dinner at Madame Thu at 7:30. Book ahead — summer slots vanish."
    );
    dao.saveRecord(rib);
  }

  setTags(dao, thu.id, "Madame Thu", [
    { label: "Kungsträdgården · 5 min", kind: "walk" },
    { label: "Book ahead",               kind: "must" },
  ]);
  setTags(dao, thu.id, "Pharmarium", [
    { label: "Gamla Stan", kind: "walk" },
  ]);
  setTags(dao, fri.id, "Café Pascal", [
    { label: "10 min walk", kind: "walk" },
  ]);
  setTags(dao, fri.id, "Premium Grill Odenplan", [
    { label: "Odenplan · 15 min", kind: "taxi" },
    { label: "Book ahead",        kind: "must" },
  ]);
});
