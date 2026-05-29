/// <reference path="../pb_data/types.d.ts" />
// BCN Fri 5 Jun: replace the optional 11pm "El Born cocktail crawl (if game)"
// slot with La Terrrazza — open-air club at Poble Español, Montjuïc. This
// Friday's bill is CLOSA SELECTS: Tripolism (Tripolism + Denoir, melodic
// house / techno), doors 7pm, runs late. Fri 5 Jun is the Friday of BCN
// stag — Primavera nap-recovery day, big paella at 8:30pm, then club.
//
// Idempotent: matches by old title; bails once swapped.

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
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); }
  catch (_) {
    console.log("[1748000023_bcn_friday_la_terrrazza] bcn stag not found, skipping");
    return;
  }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-05" });

  swapSlot(dao, fri.id, "El Born cocktail crawl (if game)", {
    start_time:  "2026-06-05T23:00:00",
    time_label:  "11:00pm · open-air club",
    title:       "La Terrrazza",
    note:        "Barcelona's only proper open-air club, set inside Poble Español up on Montjuïc — walled-village setting, sky overhead. Friday 5 June bill: CLOSA SELECTS: Tripolism (Tripolism + Denoir, melodic house / techno). Doors 7pm, runs late, 18+.\n\nGrab Fever tickets ahead — the link the group has is a specific 5 Jun session. Taxi from Barceloneta after Xiringuito Escribà is ~15 min. Dress isn't strict but it's a club crowd, not the beach kit.\n\nIf the group's wiped after Primavera + paella, this is the easy skip — \"two of us are going, see you Sitges-morning.\" Saturday's an early train south so don't kill yourself.",
    tags:        [{ label: "Poble Español · 15 min", kind: "taxi" }, { label: "Tickets via Fever", kind: "must" }, { label: "18+", kind: "info" }],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" +
                 encodeURIComponent("La Terrrazza Poble Español Barcelona"),
    website_url: "https://feverup.com/m/612472/en?date=2026-06-05&session_id=427850304",
  });

  console.log("[1748000023_bcn_friday_la_terrrazza] Fri El Born crawl → La Terrrazza");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); } catch (_) { return; }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-05" });

  swapSlot(dao, fri.id, "La Terrrazza", {
    start_time:  "2026-06-05T23:00:00",
    time_label:  "11:00pm · optional drinks",
    title:       "El Born cocktail crawl (if game)",
    note:        "Bestiari → Mariposa Negra → Especiarium. All within 3 min of each other. Or just home — Saturday's a proper day.",
    tags:        [],
    is_featured: false,
    map_url:     "",
    website_url: "",
  });
});
