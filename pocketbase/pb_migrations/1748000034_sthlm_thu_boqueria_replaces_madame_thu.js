/// <reference path="../pb_data/types.d.ts" />
// Sthlm Thu 11 Jun: swap the 7:30pm first-night dinner from Madame Thu to
// Boqueria — Spanish tapas bar in Mood Gallerian (Jakobsbergsgatan 17,
// Norrmalm), ~8 min walk from the hotel. Keeps the shared-plate opener role and
// rolls into the 9:30pm SUS rooftop. Done in place so it keeps its sort position
// between the jet ski and SUS.
//
// Idempotent: on up, matches by the Madame Thu title; on down, by Boqueria.

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
    console.log("[1748000034] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  const slot = findSlotByTitle(dao, thu.id, "Madame Thu");
  if (!slot) {
    console.log("[1748000034] Madame Thu slot not found (already swapped?), skipping");
    return;
  }

  slot.set("title", "Boqueria");
  slot.set("note",
    "Spanish tapas bar in Mood Gallerian, Jakobsbergsgatan 17 — ~8 min walk from the hotel. Lively sharing-plate format: jamón ibérico, patatas bravas, gambas al ajillo, croquetas, a bottle or two of cava or rioja. A good easy opener before the night's drinks — order a spread for the table and graze.\n\nBook ahead for a group; it gets busy. Then it's a short walk up to the SUS rooftop for the 9:30 drinks."
  );
  slot.set("tags", [
    { label: "Jakobsbergsgatan 17 · ~8 min", kind: "walk" },
    { label: "Book ahead", kind: "must" },
  ]);
  slot.set("map_url", mapsSearchUrl("Boqueria Mood Gallerian Stockholm"));
  slot.set("website_url", "https://boqueriastockholm.se/en");
  slot.set("is_featured", true);

  dao.saveRecord(slot);
  console.log("[1748000034] Thu dinner swapped Madame Thu → Boqueria");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  const slot = findSlotByTitle(dao, thu.id, "Boqueria");
  if (!slot) return;

  slot.set("title", "Madame Thu");
  slot.set("note",
    "★ 4.8. Vietnamese sharing tapas opposite Kungsträdgården. Quick, attentive, shared-plate format — a good easy opener before the first night's drinks. Open Thu to 9pm so we walk straight into cocktails after.\n\nBackup if you'd rather a proper Swedish welcome dinner: Stockholms Gästabud (★ 4.7, 6,500 reviews) does the meatballs and reindeer — but it's small with queues, so call ahead for a group."
  );
  slot.set("tags", [
    { label: "Kungsträdgården · 15 min", kind: "walk" },
    { label: "Book ahead", kind: "must" },
  ]);
  slot.set("map_url", mapsSearchUrl("Madame Thu Stockholm"));
  slot.set("website_url", "");
  slot.set("is_featured", true);

  dao.saveRecord(slot);
});
