/// <reference path="../pb_data/types.d.ts" />
// Sthlm club additions:
//   Thu 11 Jun: append Trädgården at midnight (Thursday techno night,
//               17:00–03:00 in summer at Hammarby Slussväg 2).
//   Fri 12 Jun: swap Trädgården → Zora at 1am (R&B/Hip-Hop/Afrobeats
//               two-floor club at Birger Jarlsgatan 22, Stureplan; opens 23:59).
//
// Idempotent: Thu insert checks by title; Fri swap matches the old title.

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

function appendSlot(dao, dayId, data) {
  if (findSlotByTitle(dao, dayId, data.title)) return false;
  const existing = dao.findRecordsByFilter("slots",
    "day = {:day}",
    "-sort_order",
    1, 0,
    { day: dayId });
  const nextOrder = existing.length === 0 ? 0 : existing[0].get("sort_order") + 1;

  const col = dao.findCollectionByNameOrId("slots");
  const rec = new Record(col, {
    day:          dayId,
    start_time:   data.start_time,
    time_label:   data.time_label,
    title:        data.title,
    note:         data.note,
    tags:         data.tags || [],
    is_featured:  !!data.is_featured,
    sort_order:   nextOrder,
    map_url:      data.map_url || "",
    website_url:  data.website_url || "",
  });
  dao.saveRecord(rec);
  return true;
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
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); }
  catch (_) {
    console.log("[1748000017_sthlm_thu_tradgarden_fri_zora] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });
  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-12" });

  // ── Thu: append Trädgården after Pharmarium ──────────────────────────
  appendSlot(dao, thu.id, {
    start_time:  "2026-06-12T00:00:00",
    time_label:  "midnight · techno",
    title:       "Trädgården",
    note:        "★ 4.0 · open-air club under a bridge in Hammarby. Thursdays go full techno in summer (17:00–03:00). After Pharmarium it's a 12 min taxi over — perfect first-night escalation if anyone's still got it in them. Same venue we hit Friday from Othilia, but Thursday's a different crowd and a different sound.\n\nSkip-friendly: if the group's wiped from the flight + jet ski + Madame Thu + Pharmarium, this is a totally fine \"two of us are going, see you tomorrow\" slot.",
    tags:        [{ label: "Hammarby · 12 min", kind: "taxi" }],
    is_featured: false,
    map_url:     mapsSearchUrl("Trädgården Stockholm"),
    website_url: "https://www.tradgarden.com/",
  });

  // ── Fri: swap Trädgården → Zora ─────────────────────────────────────
  swapSlot(dao, fri.id, "Trädgården", {
    start_time:  "2026-06-13T01:00:00",
    time_label:  "1:00am · club",
    title:       "Zora",
    note:        "Stockholm's go-to R&B / Hip-Hop / Afrobeats / Amapiano night, every Friday 23:59–05:00. Two-floor club right on Stureplan at Birger Jarlsgatan 22 — short taxi from Othilia and central enough to bail back to the hotel on foot.\n\nWhy this over Trädgården on Friday: Friday at Trädgården is house/techno same as Thursday's energy, but Zora is the one Friday-only spot in town for this sound — easier to walk into late, easier to leave, and the vibe lands harder for a group than another open-air bridge night.",
    tags:        [{ label: "Stureplan · 8 min", kind: "taxi" }],
    is_featured: false,
    map_url:     mapsSearchUrl("Zora nightclub Birger Jarlsgatan Stockholm"),
    website_url: "https://zorafest.se/",
  });

  console.log("[1748000017_sthlm_thu_tradgarden_fri_zora] Thu Trädgården appended, Fri Trädgården → Zora");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });
  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-12" });

  // Remove Thu Trädgården (it was the last slot, no sort_order compacting needed).
  const thuTrad = findSlotByTitle(dao, thu.id, "Trädgården");
  if (thuTrad) dao.deleteRecord(thuTrad);

  // Restore Fri Zora → Trädgården.
  swapSlot(dao, fri.id, "Zora", {
    start_time:  "2026-06-13T01:00:00",
    time_label:  "1:00am · club",
    title:       "Trädgården",
    note:        "★ 4.0 · 1,200 reviews. Open-air club under a bridge in Hammarby. Multiple DJ areas, food trucks, basketball court inside, swings between zones. Genuinely unique. Only open Fri/Sat in summer.",
    tags:        [{ label: "15 min taxi", kind: "taxi" }],
    is_featured: false,
    map_url:     mapsSearchUrl("Trädgården Stockholm"),
    website_url: "",
  });
});
