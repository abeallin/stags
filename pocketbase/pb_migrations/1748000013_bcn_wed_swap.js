/// <reference path="../pb_data/types.d.ts" />
// Barcelona Wed 3 Jun: swap the order of dinner and rooftop drinks.
//   Vivo Tapas:                8:00pm → 7:00pm, sort_order 2 → 1
//   The Rooftop at Sir Victor: 6:45pm → 9:00pm, sort_order 1 → 2 (+ note reworked
//                              from pre-dinner aperitivo to post-dinner sunset drinks)
//
// Before: 0 arrival · 1 rooftop · 2 dinner · 3 Paradiso
// After:  0 arrival · 1 dinner  · 2 rooftop · 3 Paradiso
//
// Idempotent: assigns absolute values matched by title, so re-running is a no-op.

const BCN = "bcn";

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

// Set only the provided fields on a slot, matched by title. Leaves everything
// else (tags, is_featured, map_url, website_url) untouched.
function updateSlot(dao, dayId, title, patch) {
  const slot = findSlotByTitle(dao, dayId, title);
  if (!slot) return false;
  for (const k of Object.keys(patch)) slot.set(k, patch[k]);
  dao.saveRecord(slot);
  return true;
}

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = findStag(dao, BCN); }
  catch (_) {
    console.log("[1748000013_bcn_wed_swap] bcn stag not found, skipping");
    return;
  }

  const wed = findDay(dao, stag.id, "2026-06-03");

  // Dinner first, at 7pm.
  updateSlot(dao, wed.id, "Vivo Tapas", {
    start_time: "2026-06-03T19:00:00",
    time_label: "7:00pm · dinner",
    sort_order: 1,
  });

  // Rooftop after dinner, at 9pm — catches the ~9:25pm sunset.
  updateSlot(dao, wed.id, "The Rooftop at Sir Victor", {
    start_time:  "2026-06-03T21:00:00",
    time_label:  "9:00pm · sunset drinks",
    sort_order:  2,
    note:        "★ Sunset drinks on the Sir Victor rooftop after dinner — wooden deck, glittering pool, sleek bar, with Gaudí's La Pedrera one block away and the Sagrada Família spires beyond. Early-June sunset is ~9:25pm, so 9pm puts you on the terrace right as the light goes gold. Creative cocktails and organic wines, then roll on to Paradiso.\n\nIt's a hotel rooftop and fills up at golden hour — worth booking a table, or get there early for the loungers. Carrer del Rosselló 265, top of Passeig de Gràcia.",
  });

  console.log("[1748000013_bcn_wed_swap] dinner/rooftop order swapped");
}, (db) => {
  // Down: restore pre-dinner rooftop ordering.
  const dao = new Dao(db);

  let stag;
  try { stag = findStag(dao, BCN); } catch (_) { return; }

  const wed = findDay(dao, stag.id, "2026-06-03");

  updateSlot(dao, wed.id, "Vivo Tapas", {
    start_time: "2026-06-03T20:00:00",
    time_label: "8:00pm · dinner",
    sort_order: 2,
  });

  updateSlot(dao, wed.id, "The Rooftop at Sir Victor", {
    start_time:  "2026-06-03T18:45:00",
    time_label:  "6:45pm · rooftop aperitivo",
    sort_order:  1,
    note:        "★ Pre-dinner drinks on the Sir Victor rooftop — wooden deck, glittering pool, sleek bar and Mediterranean small plates, with Gaudí's La Pedrera one block away and the Sagrada Família spires in the distance. Creative cocktails and organic wines. The ideal way to ease into the trip after landing, before strolling down to Vivo Tapas.\n\nIt's a hotel rooftop and fills up at golden hour — worth booking a table, or get there early for the loungers. Carrer del Rosselló 265, top of Passeig de Gràcia.",
  });
});
