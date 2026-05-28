/// <reference path="../pb_data/types.d.ts" />
// Sthlm Fri 12 Jun:
//   - Delete RIB Stockholm (it now lives on Thursday afternoon instead).
//   - Move FMJ Shooting Range from 10:30am to 3:00pm.
//
// Leaves a relaxed Pascal-coffee morning → afternoon adrenaline at FMJ →
// Premium Grill at 8pm. Friday morning is intentionally open for sights /
// sleep-in / brunch wherever.
//
// Idempotent: each step checks the current state before mutating.

const STHLM = "sthlm";

function findSlotByTitle(dao, dayId, title) {
  try {
    return dao.findFirstRecordByFilter("slots",
      "day = {:day} && title = {:title}",
      { day: dayId, title: title });
  } catch (_) { return null; }
}

function deleteByTitle(dao, dayId, title) {
  const slot = findSlotByTitle(dao, dayId, title);
  if (!slot) return false;
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
  return true;
}

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); }
  catch (_) {
    console.log("[1748000012_sthlm_friday_fmj] sthlm stag not found, skipping");
    return;
  }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-12" });

  // 1) Delete the Friday RIB slot (lives on Thursday now).
  deleteByTitle(dao, fri.id, "RIB Stockholm");

  // 2) Retime FMJ to 3pm.
  const fmj = findSlotByTitle(dao, fri.id, "FMJ Shooting Range");
  if (fmj) {
    fmj.set("start_time", "2026-06-12T15:00:00");
    fmj.set("time_label", "3:00pm · afternoon adrenaline");
    fmj.set("note",
      "★ 4.9. Indoor, instructor-led shooting with real firearms — Stockholm's highest-rated range, and very safe for first-timers. Handles groups of 10–15 and you keep your spent shells. The cleanest adrenaline hit of the trip: no weather risk, no licences, no boats.\n\nAfternoon timing leaves the morning free for Pascal coffee and a slow sleep-in after Thursday's first night out, then straight from FMJ to dinner at Premium Grill. Book ahead; group sessions fill."
    );
    dao.saveRecord(fmj);
  }

  console.log("[1748000012_sthlm_friday_fmj] FMJ retimed to 3pm + Fri RIB removed");
}, (db) => {
  // Down: restore FMJ to 10:30am and re-insert the Friday RIB at sort_order=2.
  const dao = new Dao(db);

  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const fri = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-12" });

  const fmj = findSlotByTitle(dao, fri.id, "FMJ Shooting Range");
  if (fmj) {
    fmj.set("start_time", "2026-06-12T10:30:00");
    fmj.set("time_label", "10:30am · morning adrenaline");
    fmj.set("note",
      "★ 4.9. Indoor, instructor-led shooting with real firearms — Stockholm's highest-rated range, and very safe for first-timers. Handles groups of 10–15 and you keep your spent shells. The cleanest adrenaline hit of the trip: no weather risk, no licences, no boats.\n\nThis takes the old Vasa Museum slot — but Vasa is open till 5pm, so anyone who'd rather see the salvaged 17th-century warship can peel off and rejoin for the RIB. Book the range ahead; group sessions fill."
    );
    dao.saveRecord(fmj);
  }

  if (!findSlotByTitle(dao, fri.id, "RIB Stockholm")) {
    const above = dao.findRecordsByFilter("slots",
      "day = {:day} && sort_order >= {:t}",
      "-sort_order",
      200, 0,
      { day: fri.id, t: 2 });
    for (const s of above) {
      s.set("sort_order", s.get("sort_order") + 1);
      dao.saveRecord(s);
    }

    const col = dao.findCollectionByNameOrId("slots");
    const rec = new Record(col, {
      day:          fri.id,
      start_time:   "2026-06-12T14:30:00",
      time_label:   "2:30pm · high-speed archipelago",
      title:        "RIB Stockholm",
      note:         "★ 5.0. A high-speed RIB blast through the archipelago — ~80 km/h, dry suits provided, launching from Strandvägen right in the centre. The captain drives, so no licence faff and no sober rule: the whole group can drink. Skippers get rave reviews for being funny and full of local history. The easiest \"exciting\" win of the weekend, and it lands you back with time to rest before dinner.\n\nThis takes the old Vinterviken sauna slot — the sauna craving gets covered by Saturday's Bastuflotten raft instead. Book ahead.",
      tags:        [{ label: "Strandvägen · central", kind: "info" }, { label: "Dry suits provided", kind: "info" }, { label: "Book ahead", kind: "must" }],
      is_featured: true,
      sort_order:  2,
      map_url:     "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("RIB Stockholm Strandvägen"),
      website_url: "",
    });
    dao.saveRecord(rec);
  }
});
