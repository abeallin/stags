/// <reference path="../pb_data/types.d.ts" />
// Sthlm meal swaps + new slots:
//   Thu 11 Jun: insert TRIBOWL STHLM (post-landing brunch, 14:30);
//               replace Lilla Gästabud → Madame Thu (Thu dinner, 19:30).
//   Fri 12 Jun: replace Punk Royale → Premium Grill Odenplan (Fri dinner, 20:00).
//   Sat 13 Jun: insert Kajsas Fisk (post-archipelago lunch, 14:45).
//
// Idempotent: existence-checks each insert by (day, title); each update only
// fires when the slot's current title is the pre-swap one.

const STHLM = "sthlm";

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

// Bump every slot on `day` whose sort_order >= threshold by +1, so that
// `threshold` becomes free for an insert.
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

// Overwrite an existing slot's content. Used for swaps (Lilla→Madame Thu, Punk
// Royale→Premium Grill). Match by old title; bail if already swapped.
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
  try { stag = findStag(dao, STHLM); }
  catch (_) {
    console.log("[1748000010_sthlm_meals] sthlm stag not found, skipping");
    return;
  }

  // ─── Thu 11 Jun ──────────────────────────────────────────────────────
  const thu = findDay(dao, stag.id, "2026-06-11");

  // 1) Insert TRIBOWL at sort_order=1 (between 09:00 flight and 15:00 check-in).
  insertSlot(dao, thu.id, 1, {
    start_time:  "2026-06-11T14:30:00",
    time_label:  "2:30pm · post-landing brunch",
    title:       "TRIBOWL STHLM",
    note:        "★ 4.8. Fresh grain-and-protein bowls on Kungsgatan, 5 min from the hotel. Quick, genuinely high quality — perfect way to land into the city.\n\nHonest catch: the room is small. A group of 4-6 will struggle for a table — go before noon if you can, or peel off in twos.\n\nIf the whole group needs a sit-down brunch that swallows the table, drop to Greasy Spoon or STHLM Brunch Club (both 4.0-4.3 tier — below our usual line, but they'll seat everyone).",
    tags:        [{ label: "Norrmalm · 5 min", kind: "walk" }, { label: "Small room", kind: "info" }],
    is_featured: false,
    map_url:     mapsSearchUrl("TRIBOWL STHLM Kungsgatan Stockholm"),
    website_url: "",
  });

  // 2) Swap Lilla Gästabud → Madame Thu at 19:30.
  swapSlot(dao, thu.id, "Lilla Gästabud", {
    start_time:  "2026-06-11T19:30:00",
    time_label:  "7:30pm · first-night dinner",
    title:       "Madame Thu",
    note:        "★ 4.8. Vietnamese sharing tapas opposite Kungsträdgården. Quick, attentive, shared-plate format — a good easy opener before the first night's drinks. Open Thu to 9pm so we walk straight into cocktails after.\n\nBackup if you'd rather a proper Swedish welcome dinner: Stockholms Gästabud (★ 4.7, 6,500 reviews) does the meatballs and reindeer — but it's small with queues, so call ahead for a group.",
    tags:        [{ label: "Kungsträdgården · 5 min", kind: "walk" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     mapsSearchUrl("Madame Thu Stockholm"),
    website_url: "",
  });

  // ─── Fri 12 Jun ──────────────────────────────────────────────────────
  const fri = findDay(dao, stag.id, "2026-06-12");

  // Swap Punk Royale → Premium Grill Odenplan at 20:00.
  swapSlot(dao, fri.id, "Punk Royale", {
    start_time:  "2026-06-12T20:00:00",
    time_label:  "8:00pm · the main event",
    title:       "Premium Grill Odenplan",
    note:        "★ 4.9. Casual BBQ, big value, generous plates. Open to 3am Friday — eat huge and walk straight into the night, no awkward gap before Othilia and Trädgården.\n\nBackup if the group wants classy over rowdy for the big night: Ekstedt (★ 4.7, Michelin) — everything cooked over open fire, kitchen tour included, open to 1am. Top price level. Book well ahead.",
    tags:        [{ label: "Odenplan · 15 min", kind: "taxi" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     mapsSearchUrl("Premium Grill Odenplan Stockholm"),
    website_url: "",
  });

  // ─── Sat 13 Jun ──────────────────────────────────────────────────────
  const sat = findDay(dao, stag.id, "2026-06-13");

  // Insert Kajsas Fisk at sort_order=3 (post-archipelago return ~14:30, pre-axe 15:30).
  // Existing Sat order: 0 heads-up, 1 Komet, 2 archipelago, 3 axe, 4 Adam/Albin, 5 cocktails.
  // After shift: axe→4, Adam→5, cocktails→6, with Kajsas at 3.
  insertSlot(dao, sat.id, 3, {
    start_time:  "2026-06-13T14:45:00",
    time_label:  "2:45pm · recovery lunch",
    title:       "Kajsas Fisk",
    note:        "★ 4.6. Iconic refillable fish soup with free bread and salad, inside the Hötorgshallen market hall. Cheap by Stockholm standards. Quick stop right between the archipelago return and axe throwing — perfect casual recovery after Friday.\n\nA hair under our 4.7 line, but for \"Saturday lunch in Norrmalm for a hungover group\" nothing beats it.\n\nIf you want a proper sit-down instead: Bistro Bestick City (★ 4.6) nearby does a well-priced multi-course menu — small room, book ahead.",
    tags:        [{ label: "Hötorgshallen · 8 min", kind: "walk" }, { label: "Quick stop", kind: "info" }],
    is_featured: false,
    map_url:     mapsSearchUrl("Kajsas Fisk Hötorgshallen Stockholm"),
    website_url: "",
  });

  console.log("[1748000010_sthlm_meals] meal swaps + inserts applied");
}, (db) => {
  // Down: undo the swaps back to the original titles, and delete the inserted slots.
  const dao = new Dao(db);

  let stag;
  try { stag = findStag(dao, STHLM); } catch (_) { return; }

  const thu = findDay(dao, stag.id, "2026-06-11");
  const fri = findDay(dao, stag.id, "2026-06-12");
  const sat = findDay(dao, stag.id, "2026-06-13");

  // Restore Thu dinner: Madame Thu → Lilla Gästabud.
  swapSlot(dao, thu.id, "Madame Thu", {
    start_time:  "2026-06-11T19:30:00",
    time_label:  "7:30pm · Swedish classics",
    title:       "Lilla Gästabud",
    note:        "★ 4.9 · 582 reviews. Tiny intimate spot in Old Town — \"the best meatball sauce I've ever tasted,\" \"best meal we've had in a very long time.\" Reindeer meatballs, braised pork cheek, smoked fish. Small space — book in advance for a group of 4-6.\n\nBackup if full: Stockholms Gästabud (the bigger sister, ★ 4.7 · 6,500 reviews).",
    tags:        [{ label: "Gamla Stan · 10 min", kind: "walk" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Lilla Gästabud Stockholm"),
    website_url: "",
  });

  // Restore Fri dinner: Premium Grill → Punk Royale.
  swapSlot(dao, fri.id, "Premium Grill Odenplan", {
    start_time:  "2026-06-12T20:00:00",
    time_label:  "8:00pm · phones away",
    title:       "Punk Royale",
    note:        "★ 4.6 · 1,100 reviews. They take your phone at the door. No menu — set tasting, vodka shots throughout, caviar, waiters with no filter. The most unhinged Michelin-tier meal in Stockholm. ~€150pp with drinks. \"You leave drunk, screaming with laughter, not sure what you ate.\"\n\nWhy this one: Friday is the party night — Punk Royale fits the energy and rolls straight into Trädgården after. The chaos is the point.",
    tags:        [{ label: "Södermalm · 15 min", kind: "taxi" }, { label: "Book NOW", kind: "must" }],
    is_featured: true,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Punk Royale Stockholm"),
    website_url: "",
  });

  // Delete the inserted slots; compact sort_orders by -1 above each gap.
  function deleteByTitle(dayId, title) {
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

  deleteByTitle(thu.id, "TRIBOWL STHLM");
  deleteByTitle(sat.id, "Kajsas Fisk");
});
