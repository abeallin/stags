/// <reference path="../pb_data/types.d.ts" />
// Sthlm Thu 11 Jun: swap the 2:30pm post-landing brunch from TRIBOWL STHLM
// to Zoey's Fresh Food (Norrlandsgatan 3, PK-huset). Same slot, same time —
// group-friendlier room and weekday hours that catch the post-flight window.
//
// Idempotent: matches the slot by old title and bails once swapped.

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
    console.log("[1748000015_sthlm_zoeys_thursday] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  swapSlot(dao, thu.id, "TRIBOWL STHLM", {
    start_time:  "2026-06-11T14:30:00",
    time_label:  "2:30pm · post-landing lunch",
    title:       "Zoey's Fresh Food",
    note:        "Norrlandsgatan 3 (PK-huset), ~10 min walk south of the hotel. Fast-casual, globally-inspired bowls + salads + burritos + wraps. Health-leaning, properly priced, weekday 10am–7pm — catches the post-flight window without forcing a sit-down commitment.\n\nGroup-friendly: order at the counter, grab a table, no booking faff. Online preorder if we want to ring it in from the Arlanda Express. Then back to the hotel to drop bags before check-in at 3pm.",
    tags:        [{ label: "Norrlandsgatan · 10 min", kind: "walk" }, { label: "Order at counter", kind: "info" }],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Zoey's Fresh Food Norrlandsgatan Stockholm"),
    website_url: "https://www.zoeys.se/",
  });

  console.log("[1748000015_sthlm_zoeys_thursday] TRIBOWL → Zoey's swapped");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  swapSlot(dao, thu.id, "Zoey's Fresh Food", {
    start_time:  "2026-06-11T14:30:00",
    time_label:  "2:30pm · post-landing brunch",
    title:       "TRIBOWL STHLM",
    note:        "★ 4.8. Fresh grain-and-protein bowls on Kungsgatan, 5 min from the hotel. Quick, genuinely high quality — perfect way to land into the city.\n\nHonest catch: the room is small. A group of 4-6 will struggle for a table — go before noon if you can, or peel off in twos.\n\nIf the whole group needs a sit-down brunch that swallows the table, drop to Greasy Spoon or STHLM Brunch Club (both 4.0-4.3 tier — below our usual line, but they'll seat everyone).",
    tags:        [{ label: "Norrmalm · 5 min", kind: "walk" }, { label: "Small room", kind: "info" }],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("TRIBOWL STHLM Kungsgatan Stockholm"),
    website_url: "",
  });
});
