/// <reference path="../pb_data/types.d.ts" />
// Sthlm Fri 12 Jun: the late-night club swaps from Zora back to Trädgården.
// The plan is to post up in the Red Room — Trädgården's hip-hop / R&B / afrobeats
// side room — and ride it to the 3am close. Done in place on the existing 1am
// club slot so it keeps its sort position after Othilia.
//
// Idempotent: on up, matches the slot by the Zora title; on down, by Trädgården.

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

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); }
  catch (_) {
    console.log("[1748000036] sthlm stag not found, skipping");
    return;
  }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-12" });

  const slot = findSlotByTitle(dao, fri.id, "Zora");
  if (!slot) {
    console.log("[1748000036] Zora slot not found (already swapped?), skipping");
    return;
  }

  slot.set("start_time", "2026-06-13T01:00:00");
  slot.set("time_label", "1:00am · club till 3am");
  slot.set("title", "Trädgården");
  slot.set("note",
    "Stockholm's legendary summer-only outdoor club, under the Skanstull bridge on the Södermalm/Hammarby line — same crew as the indoor Under Bron. Up to four dance areas: techno and house on the main stage, with the Red Room off to the side running hip-hop / R&B / afrobeats all night. That's where we're posting up.\n\nOpen Fri 17:00–03:00, so we roll in from Othilia around 1am and ride it to the 3am close. Heads up: door is 23+ and it gets rammed on a Friday — get on a guestlist or arrive with momentum. ~12 min taxi from Othilia."
  );
  slot.set("tags", [
    { label: "Hammarby · ~12 min", kind: "taxi" },
    { label: "Red Room · hip-hop/R&B", kind: "info" },
  ]);
  slot.set("is_featured", false);
  slot.set("map_url", mapsSearchUrl("Trädgården Stockholm"));
  slot.set("website_url", "https://www.tradgarden.com/");

  dao.saveRecord(slot);
  console.log("[1748000036] Fri club swapped Zora → Trädgården (Red Room till 3am)");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-12" });

  const slot = findSlotByTitle(dao, fri.id, "Trädgården");
  if (!slot) return;

  slot.set("start_time", "2026-06-13T01:00:00");
  slot.set("time_label", "1:00am · club");
  slot.set("title", "Zora");
  slot.set("note",
    "Stockholm's go-to R&B / Hip-Hop / Afrobeats / Amapiano night, every Friday 23:59–05:00. Two-floor club right on Stureplan at Birger Jarlsgatan 22 — short taxi from Othilia and central enough to bail back to the hotel on foot.\n\nWhy this over Trädgården on Friday: Friday at Trädgården is house/techno same as Thursday's energy, but Zora is the one Friday-only spot in town for this sound — easier to walk into late, easier to leave, and the vibe lands harder for a group than another open-air bridge night."
  );
  slot.set("tags", [{ label: "Stureplan · 8 min", kind: "taxi" }]);
  slot.set("is_featured", false);
  slot.set("map_url", mapsSearchUrl("Zora nightclub Birger Jarlsgatan Stockholm"));
  slot.set("website_url", "https://zorafest.se/");

  dao.saveRecord(slot);
});
