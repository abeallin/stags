/// <reference path="../pb_data/types.d.ts" />
// Sthlm Sat 13 Jun: swap Bastuflotten ReLaxa (sauna raft) → Grand Hôtel
// Nordic Spa & Fitness (Blasieholmshamnen 8). Same 11am slot — the deluxe
// 2hr bathing ritual fits 11am–1pm, leaving room for Kajsas Fisk at 1pm
// and Rosendal doors at 3pm.
//
// Idempotent: matches by old title and bails once swapped.

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
    console.log("[1748000019_sthlm_sat_grand_hotel_spa] sthlm stag not found, skipping");
    return;
  }

  const sat = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-13" });

  swapSlot(dao, sat.id, "Bastuflotten ReLaxa", {
    start_time:  "2026-06-13T11:00:00",
    time_label:  "11:00am · spa recovery",
    title:       "Grand Hôtel Nordic Spa",
    note:        "Proper five-star recovery: Grand Hôtel's Nordic Spa & Fitness at Blasieholmshamnen 8. Sauna, steam, pool, lounge — the antidote to Friday's Premium Grill → Othilia → Zora night.\n\nBook the Nordic Deluxe Bathing Ritual (~2,150 SEK pp, ~2hr) for the 11am slot — that lands us at ~1pm, perfect timing to walk to Kajsas Fisk for fish soup, then tram 7 to Djurgården for Rosendal doors at 3pm. Min age 16. Open Mon–Sun 9am–9pm.\n\nBook ahead — call +46 8 679 35 75 or email spa@grandhotel.se; non-guest day-pass policy is confirm-on-booking.",
    tags:        [{ label: "Blasieholmshamnen · 10 min", kind: "taxi" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     mapsSearchUrl("Grand Hôtel Nordic Spa Fitness Stockholm"),
    website_url: "https://grandhotel.se/en/spa-fitness",
  });

  console.log("[1748000019_sthlm_sat_grand_hotel_spa] Sat Bastuflotten → Grand Hôtel Nordic Spa");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const sat = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-13" });

  swapSlot(dao, sat.id, "Grand Hôtel Nordic Spa", {
    start_time:  "2026-06-13T11:00:00",
    time_label:  "11:00am · recovery sauna raft",
    title:       "Bastuflotten ReLaxa",
    note:        "★ 4.9. A wood-fired sauna raft that cruises the archipelago while you sweat and plunge into the cold water between sessions. BYO drinks, beer-can holders, speakers. Reviewers literally call it the perfect after-a-big-night activity — exactly what you need after Friday's Premium Grill → Othilia → Trädgården. The most Swedish thing you'll do all weekend.\n\nBoth the raft and the festival sit on the Djurgården water, so this flows straight into Rosendal. Book ahead.",
    tags:        [{ label: "Sauna raft · BYO", kind: "info" }, { label: "Book ahead", kind: "must" }],
    is_featured: true,
    map_url:     mapsSearchUrl("Bastuflotten ReLaxa Stockholm"),
    website_url: "",
  });
});
