/// <reference path="../pb_data/types.d.ts" />
// Sthlm Fri 12 Jun: the big-night dinner moves from Premium Grill Odenplan (8pm)
// to Asian Post Office (Regeringsgatan 66, Norrmalm) with a table booked
// 9:00–11:30pm. Pan-Asian fusion + cocktail bar, ~12 min walk from the hotel,
// rolls straight into Othilia at 11pm. Swap is done in place on the existing
// dinner slot so it keeps its sort position between FMJ and Othilia.
//
// Idempotent: on up, matches the slot by the Premium Grill title; on down,
// matches by Asian Post Office.

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
    console.log("[1748000030] sthlm stag not found, skipping");
    return;
  }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-12" });

  const slot = findSlotByTitle(dao, fri.id, "Premium Grill Odenplan");
  if (!slot) {
    console.log("[1748000030] Premium Grill slot not found (already swapped?), skipping");
    return;
  }

  slot.set("start_time", "2026-06-12T21:00:00");
  slot.set("time_label", "9:00pm · the main event");
  slot.set("title", "Asian Post Office");
  slot.set("note",
    "Regeringsgatan 66, Norrmalm — table booked 9:00–11:30pm. Pan-Asian fusion in a stripped-back Asian-meets-Nordic room: Japanese technique, Indian spice, Korean ingredients. Go-tos: shiitake dumplings, pork buns, crispy pork belly; the Thai basil cocktail is the signature pour. ~12 min walk from the hotel.\n\nBooked through to 11:30, then it's a short hop down to Othilia for cocktails at 11pm and on to Zora after."
  );
  slot.set("tags", [
    { label: "Regeringsgatan 66 · ~12 min", kind: "walk" },
    { label: "Booked 9–11.30pm", kind: "book" },
  ]);
  slot.set("map_url", mapsSearchUrl("Asian Post Office Regeringsgatan 66 Stockholm"));
  slot.set("website_url", "https://www.asianpostoffice.se/");
  slot.set("is_featured", true);

  dao.saveRecord(slot);
  console.log("[1748000030] Fri dinner swapped Premium Grill → Asian Post Office (9–11.30pm)");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-12" });

  const slot = findSlotByTitle(dao, fri.id, "Asian Post Office");
  if (!slot) return;

  slot.set("start_time", "2026-06-12T20:00:00");
  slot.set("time_label", "8:00pm · the main event");
  slot.set("title", "Premium Grill Odenplan");
  slot.set("note",
    "★ 4.9. Casual BBQ, big value, generous plates. Open to 3am Friday — eat huge and walk straight into the night, no awkward gap before Othilia and Trädgården.\n\nBackup if the group wants classy over rowdy for the big night: Ekstedt (★ 4.7, Michelin) — everything cooked over open fire, kitchen tour included, open to 1am. Top price level. Book well ahead."
  );
  slot.set("tags", [
    { label: "Odenplan · 15 min", kind: "walk" },
    { label: "Book ahead", kind: "must" },
  ]);
  slot.set("map_url", mapsSearchUrl("Premium Grill Odenplan Stockholm"));
  slot.set("website_url", "");
  slot.set("is_featured", true);

  dao.saveRecord(slot);
});
