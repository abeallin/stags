/// <reference path="../pb_data/types.d.ts" />
// Sthlm activity reshuffle, driven by the Rosendal Garden Party (12-14 Jun)
// landing on Saturday — doors 3pm, Kaytranada closes ~10:45pm.
//
//   Fri 12 Jun: swap Vasa Museum        → FMJ Shooting Range (morning adrenaline);
//               swap Sthlm Sauna         → RIB Stockholm      (afternoon archipelago blast).
//   Sat 13 Jun: swap Archipelago Ride    → Bastuflotten ReLaxa (recovery sauna raft, 11am);
//               retime Kajsas Fisk        → 1pm pre-festival lunch;
//               delete Mad Axe, Adam/Albin, Bar Lilla Compagniet;
//               insert Rosendal Garden Party as the evening finale.
//   Day titles: Fri "Sauna + sights + party" → "Adrenaline + party night";
//               Sat "Archipelago + finale"   → "Recovery + Rosendal".
//
// Idempotent: swaps match by current title and bail once swapped; the insert
// existence-checks by title; the deletes no-op if already gone.

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

function setDayTitle(dao, day, fromTitle, toTitle) {
  if (day.get("title") !== fromTitle) return;
  day.set("title", toTitle);
  dao.saveRecord(day);
}

function findSlotByTitle(dao, dayId, title) {
  try {
    return dao.findFirstRecordByFilter("slots",
      "day = {:day} && title = {:title}",
      { day: dayId, title: title });
  } catch (_) { return null; }
}

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

// Overwrite an existing slot's content, matched by its current title.
// Used for the swaps and the Kajsas retime; bails if already swapped.
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

// Delete a slot by title and compact every sort_order above it by -1.
function deleteByTitle(dao, dayId, title) {
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

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = findStag(dao, STHLM); }
  catch (_) {
    console.log("[1748000011_sthlm_activities] sthlm stag not found, skipping");
    return;
  }

  // ─── Fri 12 Jun ──────────────────────────────────────────────────────
  const fri = findDay(dao, stag.id, "2026-06-12");

  // 1) Vasa Museum → FMJ Shooting Range (10:30am morning adrenaline).
  swapSlot(dao, fri.id, "Vasa Museum on Djurgården", {
    start_time:  "2026-06-12T10:30:00",
    time_label:  "10:30am · morning adrenaline",
    title:       "FMJ Shooting Range",
    note:        "★ 4.9. Indoor, instructor-led shooting with real firearms — Stockholm's highest-rated range, and very safe for first-timers. Handles groups of 10–15 and you keep your spent shells. The cleanest adrenaline hit of the trip: no weather risk, no licences, no boats.\n\nThis takes the old Vasa Museum slot — but Vasa is open till 5pm, so anyone who'd rather see the salvaged 17th-century warship can peel off and rejoin for the RIB. Book the range ahead; group sessions fill.",
    tags:        [{ label: "Instructor-led", kind: "info" }, { label: "Book ahead", kind: "must" }],
    is_featured: false,
    map_url:     mapsSearchUrl("FMJ Shooting Range Stockholm"),
    website_url: "",
  });

  // 2) Sthlm Sauna Vinterviken → RIB Stockholm (2:30pm high-speed archipelago).
  swapSlot(dao, fri.id, "Sthlm Sauna Vinterviken", {
    start_time:  "2026-06-12T14:30:00",
    time_label:  "2:30pm · high-speed archipelago",
    title:       "RIB Stockholm",
    note:        "★ 5.0. A high-speed RIB blast through the archipelago — ~80 km/h, dry suits provided, launching from Strandvägen right in the centre. The captain drives, so no licence faff and no sober rule: the whole group can drink. Skippers get rave reviews for being funny and full of local history. The easiest \"exciting\" win of the weekend, and it lands you back with time to rest before dinner.\n\nThis takes the old Vinterviken sauna slot — the sauna craving gets covered by Saturday's Bastuflotten raft instead. Book ahead.",
    tags:        [{ label: "Strandvägen · central", kind: "info" }, { label: "Dry suits provided", kind: "info" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     mapsSearchUrl("RIB Stockholm Strandvägen"),
    website_url: "",
  });

  setDayTitle(dao, fri, "Sauna + sights + party", "Adrenaline + party night");

  // ─── Sat 13 Jun ──────────────────────────────────────────────────────
  const sat = findDay(dao, stag.id, "2026-06-13");

  // 3) Stockholm Archipelago Summer Ride → Bastuflotten ReLaxa (11am recovery).
  swapSlot(dao, sat.id, "Stockholm Archipelago Summer Ride", {
    start_time:  "2026-06-13T11:00:00",
    time_label:  "11:00am · recovery sauna raft",
    title:       "Bastuflotten ReLaxa",
    note:        "★ 4.9. A wood-fired sauna raft that cruises the archipelago while you sweat and plunge into the cold water between sessions. BYO drinks, beer-can holders, speakers. Reviewers literally call it the perfect after-a-big-night activity — exactly what you need after Friday's Premium Grill → Othilia → Trädgården. The most Swedish thing you'll do all weekend.\n\nBoth the raft and the festival sit on the Djurgården water, so this flows straight into Rosendal. Book ahead.",
    tags:        [{ label: "Sauna raft · BYO", kind: "info" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     mapsSearchUrl("Bastuflotten ReLaxa Stockholm"),
    website_url: "",
  });

  // 4) Retime Kajsas Fisk → 1:00pm pre-festival lunch (was 2:45pm, now ahead of 3pm doors).
  swapSlot(dao, sat.id, "Kajsas Fisk", {
    start_time:  "2026-06-13T13:00:00",
    time_label:  "1:00pm · pre-festival lunch",
    title:       "Kajsas Fisk",
    note:        "★ 4.6. Iconic refillable fish soup with free bread and salad, inside the Hötorgshallen market hall. Cheap by Stockholm standards. A quick, hearty stop after the sauna raft and before festival doors at 3pm.\n\nIf you'd rather just eat at Rosendal, the festival has Greasy Spoon, an oyster bar, lobster rolls and a proper wine/cocktail area — so this is optional.",
    tags:        [{ label: "Hötorgshallen · 8 min", kind: "walk" }, { label: "Quick stop", kind: "info" }],
    is_featured: false,
    map_url:     mapsSearchUrl("Kajsas Fisk Hötorgshallen Stockholm"),
    website_url: "",
  });

  // 5) Drop the old Saturday afternoon/evening — the festival owns it now.
  deleteByTitle(dao, sat.id, "Mad Axe Throwing Club");
  deleteByTitle(dao, sat.id, "Adam/Albin");
  deleteByTitle(dao, sat.id, "Bar Lilla Compagniet → Trädgården");

  // 6) Insert Rosendal Garden Party as the evening finale (after Kajsas at sort 3).
  insertSlot(dao, sat.id, 4, {
    start_time:  "2026-06-13T15:00:00",
    time_label:  "3:00pm → midnight · the finale",
    title:       "Rosendal Garden Party",
    note:        "★ The Saturday night. Doors 3pm at Rosendal Trädgård on Djurgården, running to midnight. Saturday's bill: Good Vibes DJs + STOR → Sasha Keable (5:30pm) → De La Soul (7:00pm) → TLC (8:45pm) → Kaytranada closing at 10:45pm. Food and drink on site — Greasy Spoon, oyster bar, lobster rolls, a big wine/cocktail area — so no dinner booking needed. This replaces Adam/Albin as the send-off.\n\nGetting there: tram 7 to Bellmansro/Waldemarsudde, or a short taxi from the centre. Tickets required — grab Saturday day-passes (or a 3-day) at rosendal.com before they sell out.\n\nStill standing after Kaytranada? Trädgården is the natural after-party.",
    tags:        [{ label: "Djurgården · tram 7", kind: "train" }, { label: "Tickets required", kind: "must" }],
    is_featured: true,
    map_url:     mapsSearchUrl("Rosendal Trädgård Djurgården Stockholm"),
    website_url: "https://www.rosendal.com/",
  });

  setDayTitle(dao, sat, "Archipelago + finale", "Recovery + Rosendal");

  console.log("[1748000011_sthlm_activities] activity reshuffle applied");
}, (db) => {
  // Down: restore the original activities and day titles.
  const dao = new Dao(db);

  let stag;
  try { stag = findStag(dao, STHLM); } catch (_) { return; }

  const fri = findDay(dao, stag.id, "2026-06-12");
  const sat = findDay(dao, stag.id, "2026-06-13");

  // Restore Fri: FMJ → Vasa Museum, RIB → Sthlm Sauna Vinterviken.
  swapSlot(dao, fri.id, "FMJ Shooting Range", {
    start_time:  "2026-06-12T10:30:00",
    time_label:  "10:30am · museum",
    title:       "Vasa Museum on Djurgården",
    note:        "★ 4.8 · 67,000 reviews. A 17th-century warship that sank on its maiden voyage, salvaged 333 years later, now in a custom museum. Genuinely jaw-dropping even if you don't do museums. Free audio guide app.",
    tags:        [{ label: "20 min tram/ferry", kind: "train" }],
    is_featured: false,
    map_url:     "",
    website_url: "",
  });

  swapSlot(dao, fri.id, "RIB Stockholm", {
    start_time:  "2026-06-12T14:30:00",
    time_label:  "2:30pm · sauna + cold plunge",
    title:       "Sthlm Sauna Vinterviken",
    note:        "★ 4.9 · \"Stockholm's finest sauna.\" Lakeside, with cold dips in the lake itself. 2hr sessions. Properly Nordic.\n\nBackup if booked out: ASCARO Sauna in central NK Parkaden (5 min from hotel) — private bookings for groups of 6, sauna + ice bath.",
    tags:        [{ label: "25 min metro", kind: "train" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     "",
    website_url: "",
  });

  setDayTitle(dao, fri, "Adrenaline + party night", "Sauna + sights + party");

  // Restore Sat: Bastuflotten → Archipelago Ride, Kajsas back to 2:45pm,
  // delete Rosendal, re-insert axe / Adam/Albin / Bar Lilla at 4 / 5 / 6.
  swapSlot(dao, sat.id, "Bastuflotten ReLaxa", {
    start_time:  "2026-06-13T12:00:00",
    time_label:  "12:00pm · archipelago tour",
    title:       "Stockholm Archipelago Summer Ride",
    note:        "★ 4.9 · 179 reviews. 2.5-hour boat through ~5 islands, commentary in English, Swedish charcuterie on board. Departs Skeppsbrokajen near Old Town. Beautiful, easy, doesn't kill the whole day.\n\nIf you want private: Stockholm Boat Tour (★ 4.7) — Gustav runs private group charters from Strandvägskajen, 2-8 hour options, swim stops, lunch on islands. Can book day-before.",
    tags:        [{ label: "2.5hr cruise", kind: "info" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     "",
    website_url: "",
  });

  swapSlot(dao, sat.id, "Kajsas Fisk", {
    start_time:  "2026-06-13T14:45:00",
    time_label:  "2:45pm · recovery lunch",
    title:       "Kajsas Fisk",
    note:        "★ 4.6. Iconic refillable fish soup with free bread and salad, inside the Hötorgshallen market hall. Cheap by Stockholm standards. Quick stop right between the archipelago return and axe throwing — perfect casual recovery after Friday.\n\nA hair under our 4.7 line, but for \"Saturday lunch in Norrmalm for a hungover group\" nothing beats it.\n\nIf you want a proper sit-down instead: Bistro Bestick City (★ 4.6) nearby does a well-priced multi-course menu — small room, book ahead.",
    tags:        [{ label: "Hötorgshallen · 8 min", kind: "walk" }, { label: "Quick stop", kind: "info" }],
    is_featured: false,
    map_url:     mapsSearchUrl("Kajsas Fisk Hötorgshallen Stockholm"),
    website_url: "",
  });

  deleteByTitle(dao, sat.id, "Rosendal Garden Party");

  insertSlot(dao, sat.id, 4, {
    start_time:  "2026-06-13T15:30:00",
    time_label:  "3:30pm · activity",
    title:       "Mad Axe Throwing Club",
    note:        "★ 4.5 · Central, walking distance from hotel. Mike runs the safety briefing, lanes for the group, properly competitive. 90 min session. Book ahead for Saturday.",
    tags:        [{ label: "10 min walk", kind: "walk" }],
    is_featured: false,
    map_url:     "",
    website_url: "",
  });

  insertSlot(dao, sat.id, 5, {
    start_time:  "2026-06-13T20:00:00",
    time_label:  "8:00pm · the finale",
    title:       "Adam/Albin",
    note:        "★ 4.8 · 664 reviews · Michelin-starred. The most consistent rave reviews in Stockholm — \"the most worthwhile Michelin-starred tasting menu I have experienced,\" \"if I could, I would award this place two Michelin stars today.\" ~€180pp. Warm, engaging service. The proper send-off meal.\n\nIf Adam/Albin is full: Ekstedt (★ 4.7 · Michelin) — everything cooked over open fire, refined and beautiful. Or Nour (★ 4.7) — Japanese-Swedish, 9 courses, hidden gem.",
    tags:        [{ label: "8 min walk", kind: "walk" }, { label: "Book WEEKS ahead", kind: "must" }],
    is_featured: true,
    map_url:     "",
    website_url: "",
  });

  insertSlot(dao, sat.id, 6, {
    start_time:  "2026-06-13T23:30:00",
    time_label:  "11:30pm · final night",
    title:       "Bar Lilla Compagniet → Trädgården",
    note:        "Lilla Compagniet (★ 4.7) for a proper cocktail in Södermalm, then back to Trädgården if anyone has anything left in the tank.",
    tags:        [{ label: "Taxi between", kind: "taxi" }],
    is_featured: false,
    map_url:     "",
    website_url: "",
  });

  setDayTitle(dao, sat, "Recovery + Rosendal", "Archipelago + finale");
});
