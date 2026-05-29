/// <reference path="../pb_data/types.d.ts" />
// Sthlm Thu 11 Jun: replace the midnight Trädgården slot with a SoFo bar-area
// slot (Södermalm, around Götgatan / Medborgarplatsen / Nytorget). User
// believes Thursday's a techno night around there — Laika and Debaser are the
// Södermalm rooms most likely to be running techno; note flags both as scout
// candidates on the night rather than locking the group to one venue.
//
// Idempotent: matches the existing Thu Trädgården slot and rewrites in place.

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
    console.log("[1748000018_sthlm_thu_sofo_replaces_tradgarden] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  swapSlot(dao, thu.id, "Trädgården", {
    start_time:  "2026-06-12T00:00:00",
    time_label:  "midnight · SoFo bars",
    title:       "SoFo bar crawl",
    note:        "Bar-hop around SoFo — Södermalm's south-of-Folkungagatan grid, around Götgatan, Medborgarplatsen and Nytorget. Dense bar district, easy to drift between rooms, less commitment than a club door.\n\nRumour is Thursday's a techno-leaning night around here — the two Södermalm rooms most likely to be running techno are Laika (industrial-vintage, mixed live + DJ programming) and Debaser (rock club with weeknight electronic crossover). Scout on the night, not before — neither publishes weekly listings reliably.\n\nSkip-friendly: if the group's wiped after the flight + jet ski + Madame Thu + Pharmarium, this is a totally fine \"two of us are going, see you tomorrow\" slot.",
    tags:        [{ label: "Södermalm · 12 min", kind: "taxi" }],
    is_featured: false,
    map_url:     mapsSearchUrl("Medborgarplatsen Södermalm Stockholm"),
    website_url: "",
  });

  console.log("[1748000018_sthlm_thu_sofo_replaces_tradgarden] Thu Trädgården → SoFo bar crawl");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  swapSlot(dao, thu.id, "SoFo bar crawl", {
    start_time:  "2026-06-12T00:00:00",
    time_label:  "midnight · techno",
    title:       "Trädgården",
    note:        "★ 4.0 · open-air club under a bridge in Hammarby. Thursdays go full techno in summer (17:00–03:00). After Pharmarium it's a 12 min taxi over — perfect first-night escalation if anyone's still got it in them. Same venue we hit Friday from Othilia, but Thursday's a different crowd and a different sound.\n\nSkip-friendly: if the group's wiped from the flight + jet ski + Madame Thu + Pharmarium, this is a totally fine \"two of us are going, see you tomorrow\" slot.",
    tags:        [{ label: "Hammarby · 12 min", kind: "taxi" }],
    is_featured: false,
    map_url:     mapsSearchUrl("Trädgården Stockholm"),
    website_url: "https://www.tradgarden.com/",
  });
});
