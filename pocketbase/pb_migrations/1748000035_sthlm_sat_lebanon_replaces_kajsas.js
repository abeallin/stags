/// <reference path="../pb_data/types.d.ts" />
// Sthlm Sat 13 Jun: swap the 1:00pm pre-festival lunch from Kajsas Fisk to
// Lebanon Meza Lounge — Lebanese meza bar at Hamngatan 6 (Norrmalm), a few
// minutes from the hotel and walkable from the Grand Hôtel spa. Keeps the
// sharing-plate lunch role before Rosendal doors at 3pm. Done in place so it
// keeps its sort position between the spa and the festival.
//
// Idempotent: on up, matches by the Kajsas Fisk title; on down, by Lebanon Meza Lounge.

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

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); }
  catch (_) {
    console.log("[1748000035] sthlm stag not found, skipping");
    return;
  }

  const sat = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-13" });

  const slot = findSlotByTitle(dao, sat.id, "Kajsas Fisk");
  if (!slot) {
    console.log("[1748000035] Kajsas Fisk slot not found (already swapped?), skipping");
    return;
  }

  slot.set("title", "Lebanon Meza Lounge");
  slot.set("note",
    "Lebanese meza bar at Hamngatan 6, central Norrmalm — a few minutes from the hotel and an easy walk from the Grand Hôtel spa. Long list of cold and warm meza built for sharing: hummus, baba ganoush, falafel, kibbeh, halloumi, grilled meats and flatbread. Order a big spread for the table and graze — a proper hearty lunch to set us up before festival doors at 3pm.\n\nIf you'd rather just eat at Rosendal, the festival has Greasy Spoon, an oyster bar, lobster rolls and a proper wine/cocktail area — so this is optional. Book ahead for a group; it gets busy."
  );
  slot.set("tags", [
    { label: "Hamngatan 6 · central", kind: "walk" },
    { label: "Book ahead", kind: "must" },
  ]);
  slot.set("is_featured", false);
  slot.set("map_url", mapsSearchUrl("Lebanon Meza Lounge Hamngatan Stockholm"));
  slot.set("website_url", "");

  dao.saveRecord(slot);
  console.log("[1748000035] Sat lunch swapped Kajsas Fisk → Lebanon Meza Lounge");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const sat = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-13" });

  const slot = findSlotByTitle(dao, sat.id, "Lebanon Meza Lounge");
  if (!slot) return;

  slot.set("title", "Kajsas Fisk");
  slot.set("note",
    "★ 4.6. Iconic refillable fish soup with free bread and salad, inside the Hötorgshallen market hall. Cheap by Stockholm standards. A quick, hearty stop after the sauna raft and before festival doors at 3pm.\n\nIf you'd rather just eat at Rosendal, the festival has Greasy Spoon, an oyster bar, lobster rolls and a proper wine/cocktail area — so this is optional."
  );
  slot.set("tags", [
    { label: "Hötorgshallen · 8 min", kind: "walk" },
    { label: "Quick stop", kind: "info" },
  ]);
  slot.set("is_featured", false);
  slot.set("map_url", mapsSearchUrl("Kajsas Fisk Hötorgshallen Stockholm"));
  slot.set("website_url", "");

  dao.saveRecord(slot);
});
