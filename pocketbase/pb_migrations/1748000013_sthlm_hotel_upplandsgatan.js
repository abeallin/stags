/// <reference path="../pb_data/types.d.ts" />
// Sthlm hotel correction: Scandic Continental → Scandic Upplandsgatan
// (Upplandsgatan 4, 111 23 Stockholm). Updates the Thursday check-in slot's
// note + map_url. Walking-distance tags on other slots are NOT touched here;
// they may need a separate pass if we want them recomputed from Upplandsgatan.

const STHLM = "sthlm";

function findSlotByTitle(dao, dayId, title) {
  try {
    return dao.findFirstRecordByFilter("slots",
      "day = {:day} && title = {:title}",
      { day: dayId, title: title });
  } catch (_) { return null; }
}

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); }
  catch (_) {
    console.log("[1748000013_sthlm_hotel_upplandsgatan] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  const slot = findSlotByTitle(dao, thu.id, "Scandic check-in → Old Town stroll");
  if (!slot) {
    console.log("[1748000013_sthlm_hotel_upplandsgatan] check-in slot not found, skipping");
    return;
  }

  slot.set("note",
    "Scandic Upplandsgatan, Upplandsgatan 4, 111 23 — Vasastan/Norrmalm border, ~5 min walk from Stockholm Central. Drop bags, then walk south to Gamla Stan (Old Town). Stortorget square, Mårten Trotzigs gränd (Stockholm's narrowest street — 90cm wide), the Royal Palace. Sets the scene."
  );
  slot.set("map_url",
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Scandic Upplandsgatan Stockholm")
  );

  // Tag was "15 min walk" — Upplandsgatan 4 → Gamla Stan is closer to 20 min.
  slot.set("tags", [{ label: "20 min walk", kind: "walk" }]);

  dao.saveRecord(slot);
  console.log("[1748000013_sthlm_hotel_upplandsgatan] check-in slot updated");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  const slot = findSlotByTitle(dao, thu.id, "Scandic check-in → Old Town stroll");
  if (!slot) return;

  slot.set("note",
    "Drop bags, then walk south to Gamla Stan (Old Town). Stortorget square, Mårten Trotzigs gränd (Stockholm's narrowest street — 90cm wide), the Royal Palace. Sets the scene."
  );
  slot.set("map_url",
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Scandic Continental Stockholm")
  );
  slot.set("tags", [{ label: "15 min walk", kind: "walk" }]);
  dao.saveRecord(slot);
});
