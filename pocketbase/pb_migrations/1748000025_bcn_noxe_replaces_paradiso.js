/// <reference path="../pb_data/types.d.ts" />
// BCN Wed 3 Jun (arrival night): swap the 10pm Paradiso speakeasy slot →
// Noxe, the rooftop house club on the 26th floor of the W Barcelona.
// Tonight there is Housy (RA event 2451728) with a free guest list, so one
// clear nightclub plan for the arrival night — lighter than a two-stop crawl
// the night before the Primavera marathon.
//
// Idempotent: matches by old title and bails once swapped.

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
    console.log("[1748000025_bcn_noxe_replaces_paradiso] bcn stag not found, skipping");
    return;
  }

  const wed = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-03" });

  swapSlot(dao, wed.id, "Paradiso speakeasy", {
    start_time:  "2026-06-03T22:00:00",
    time_label:  "10:00pm → 2am · rooftop club",
    title:       "Noxe rooftop club",
    note:        "★ Rooftop house club on the 26th floor of the W Barcelona — the whole skyline on one side, the black Mediterranean on the other. Tonight is Housy (house all night; Sarah Andersson + GIVIO). Free guest list on Resident Advisor — two entry windows, 10pm–12am or 12am–1:30am, so put names down before you leave dinner.\n\n~15 min taxi out to the Barceloneta seafront from the apartment. Strict door and they mean it: smart & chic, 21+ — no trainers, shorts, flip-flops or tank tops, and no bags (there's no cloakroom), so travel light. The easy way to cap the arrival night before the Primavera marathon.",
    tags:        [
      { label: "W Barcelona · 15 min taxi", kind: "taxi" },
      { label: "Smart/chic · 21+", kind: "must" },
      { label: "Free guest list", kind: "book" },
    ],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" +
                 encodeURIComponent("Noxe W Barcelona"),
    website_url: "https://ra.co/events/2451728",
  });

  console.log("[1748000025_bcn_noxe_replaces_paradiso] Paradiso speakeasy → Noxe rooftop club");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); } catch (_) { return; }

  const wed = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-03" });

  swapSlot(dao, wed.id, "Noxe rooftop club", {
    start_time:  "2026-06-03T22:00:00",
    time_label:  "10:00pm · cocktails",
    title:       "Paradiso speakeasy",
    note:        "Enter through the pastrami fridge. Get there 9:30pm latest. One round, then El Born bars.",
    tags:        [{ kind: "walk", label: "16 min walk" }],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=Paradiso%20Barcelona%20El%20Born",
    website_url: "https://paradiso.cat/",
  });
});
