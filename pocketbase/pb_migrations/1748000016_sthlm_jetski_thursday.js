/// <reference path="../pb_data/types.d.ts" />
// Sthlm Thu 11 Jun: swap RIB Stockholm → Happy Day jet ski safari (Ekerö).
//
// Critical timing change: RIB launched from Strömkajen (8 min from hotel),
// the jet ski launches from Ekerö (25-35 min taxi each way). The slot moves
// from 4:30pm to 3:30pm so the round-trip + 1hr ride lands back in time for
// 7:30pm dinner at Madame Thu. Note + tags spell this out.
//
// Idempotent: matches by old title and bails once swapped.

const STHLM = "sthlm";

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
    console.log("[1748000016_sthlm_jetski_thursday] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  swapSlot(dao, thu.id, "RIB Stockholm", {
    start_time:  "2026-06-11T15:30:00",
    time_label:  "3:30pm · jet ski safari",
    title:       "Happy Day Vattenskotersafari",
    note:        "Guided jet ski safari on Lake Mälaren — new Kawasaki jet skis, wetsuits provided, guide leads on their own ski so we focus on driving. Speeds well over 30 knots, no speed limit on the route. 1,995 SEK pp, max 6 per booking — fits the group, no licence needed.\n\nThe catch: launch is from Ekerö, not central Stockholm — 25-35 min taxi each way. Leave the hotel right after check-in (~3:30pm), aim for the briefing at 4pm, ride ~1hr, back at the hotel by ~6:30pm. Shower and taxi to Madame Thu for 7:30pm — tight but doable. If we want breathing room, push the Madame Thu booking to 8pm.\n\nBook ahead at happy-day.com — summer slots vanish.",
    tags:        [{ label: "Ekerö · 25 min taxi", kind: "taxi" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Happy Day Vattenskotersafari Ekerö Stockholm"),
    website_url: "https://happy-day.com/products/vattenskotersafari-stockholm",
  });

  console.log("[1748000016_sthlm_jetski_thursday] RIB → Happy Day jet ski swapped");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  swapSlot(dao, thu.id, "Happy Day Vattenskotersafari", {
    start_time:  "2026-06-11T16:30:00",
    time_label:  "4:30pm · speedboat",
    title:       "RIB Stockholm",
    note:        "1hr rigid-inflatable speedboat loop — Old Town waterfront + inner archipelago. Leaves from Strömkajen (quick taxi from the hotel — Upplandsgatan to Strömkajen is ~8 min). Proper way to see Stockholm: low and fast through the islands while everyone else is on the slow commentary boats.\n\nBring a jumper — it's open-top and the wind off the water is real even in June. Back by ~6pm, taxi to the hotel, shower, dinner at Madame Thu at 7:30. Book ahead — summer slots vanish.",
    tags:        [{ label: "Strömkajen · 8 min", kind: "taxi" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("RIB Stockholm Strömkajen"),
    website_url: "",
  });
});
