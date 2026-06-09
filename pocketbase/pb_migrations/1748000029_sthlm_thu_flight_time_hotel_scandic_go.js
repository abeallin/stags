/// <reference path="../pb_data/types.d.ts" />
// Sthlm Thu 11 Jun, two corrections:
//   1) Flight — confirmed 09:55 departure from Heathrow Terminal 2. Update the
//      start_time, time_label and note (was a vague "9–10am · LHR departure"),
//      and add a "Heathrow T2" info tag.
//   2) Hotel — the property at Upplandsgatan 4 is Scandic GO (Scandic's budget
//      brand), not "Scandic Upplandsgatan". Rename in the check-in slot note +
//      map_url. Address (Upplandsgatan 4, 111 23) is unchanged.
//
// Idempotent: matches slots by their current titles; safe to re-run.

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
    console.log("[1748000029] sthlm stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  // 1) Flight — 09:55 from Heathrow Terminal 2.
  const flight = findSlotByTitle(dao, thu.id, "Heathrow → Stockholm Arlanda");
  if (flight) {
    flight.set("start_time", "2026-06-11T09:55:00");
    flight.set("time_label", "9:55am · LHR T2 departure");
    flight.set("note",
      "Departs 09:55 from Heathrow Terminal 2 — bags dropped and through security with time to spare, so be airside by ~9am. ~2hr 40min flight + 1hr time difference = land ~1–2pm local. Arlanda Express train to Central Station (20 min, ~£26 return). Hotel is ~5 min walk from there."
    );
    flight.set("tags", [{ label: "Heathrow T2", kind: "info" }]);
    dao.saveRecord(flight);
    console.log("[1748000029] flight updated → 09:55 Heathrow T2");
  } else {
    console.log("[1748000029] flight slot not found, skipping");
  }

  // 2) Hotel — Scandic GO (Upplandsgatan 4).
  const checkin = findSlotByTitle(dao, thu.id, "Scandic check-in → Old Town stroll");
  if (checkin) {
    checkin.set("note",
      "Scandic GO, Upplandsgatan 4, 111 23 — Vasastan/Norrmalm border, ~5 min walk from Stockholm Central. Drop bags, then walk south to Gamla Stan (Old Town). Stortorget square, Mårten Trotzigs gränd (Stockholm's narrowest street — 90cm wide), the Royal Palace. Sets the scene."
    );
    checkin.set("map_url", mapsSearchUrl("Scandic GO Stockholm Upplandsgatan"));
    dao.saveRecord(checkin);
    console.log("[1748000029] hotel renamed → Scandic GO");
  } else {
    console.log("[1748000029] check-in slot not found, skipping");
  }
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-11" });

  const flight = findSlotByTitle(dao, thu.id, "Heathrow → Stockholm Arlanda");
  if (flight) {
    flight.set("start_time", "2026-06-11T09:00");
    flight.set("time_label", "9–10am · LHR departure");
    flight.set("note",
      "~2hr 40min flight + 1hr time difference = land ~1–2pm local. Arlanda Express train to Central Station (20 min, ~£26 return). Hotel is 2 min walk from there."
    );
    flight.set("tags", []);
    dao.saveRecord(flight);
  }

  const checkin = findSlotByTitle(dao, thu.id, "Scandic check-in → Old Town stroll");
  if (checkin) {
    checkin.set("note",
      "Scandic Upplandsgatan, Upplandsgatan 4, 111 23 — Vasastan/Norrmalm border, ~5 min walk from Stockholm Central. Drop bags, then walk south to Gamla Stan (Old Town). Stortorget square, Mårten Trotzigs gränd (Stockholm's narrowest street — 90cm wide), the Royal Palace. Sets the scene."
    );
    checkin.set("map_url", mapsSearchUrl("Scandic Upplandsgatan Stockholm"));
    dao.saveRecord(checkin);
  }
});
