/// <reference path="../pb_data/types.d.ts" />
// BCN apartment address findability:
//   1. Update stag.header_meta_html — add "Apt · Rosselló 244 4t 1a → Map"
//      line so the address is visible from every day in the header.
//   2. Update Thu 3 Jun arrival slot — prepend the address to the note and
//      set map_url to the apartment location, so the tap-target on arrival
//      day opens straight in Maps.
//
// Idempotent: header_meta_html only rewritten if it doesn't already mention
// Rosselló; arrival slot only updated if its current note doesn't mention it.

const APT_LABEL = "Rosselló 244 4t 1a";
const APT_MAP   = "https://www.google.com/maps/search/?api=1&query=" +
                  encodeURIComponent("Carrer de Rosselló 244 Barcelona 08008");

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
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); }
  catch (_) {
    console.log("[1748000020_bcn_apartment_address] bcn stag not found, skipping");
    return;
  }

  // 1) Header meta — append apartment line if not already present.
  const currentMeta = stag.get("header_meta_html") || "";
  if (!currentMeta.includes("Rosselló")) {
    const newMeta =
      currentMeta +
      ` · <span class="apt">Apt · ${APT_LABEL} · ` +
      `<a href="${APT_MAP}" target="_blank" rel="noopener">Map</a></span>`;
    stag.set("header_meta_html", newMeta);
    dao.saveRecord(stag);
  }

  // 2) Arrival slot — prepend address, set map_url.
  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-03" });

  const arrival = findSlotByTitle(dao, thu.id, "Land at BCN → apartment");
  if (arrival) {
    const note = arrival.get("note") || "";
    if (!note.includes("Rosselló")) {
      arrival.set("note",
        "Apartment: Rosselló 244, 4t 1a, 08008 Barcelona (Eixample, between Passeig de Gràcia and Diagonal). Tap the location pin above to open in Maps — screenshot it for if anyone gets lost later.\n\n" +
        note
      );
    }
    arrival.set("map_url", APT_MAP);
    dao.saveRecord(arrival);
  }

  console.log("[1748000020_bcn_apartment_address] apartment address added to BCN header + arrival slot");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); } catch (_) { return; }

  // Strip the appended apt line from the header.
  const meta = stag.get("header_meta_html") || "";
  const stripped = meta.replace(/ · <span class="apt">[^<]*<\/span>/, "")
                       .replace(/ · <span class="apt">.*?<\/span>/, "");
  if (stripped !== meta) {
    stag.set("header_meta_html", stripped);
    dao.saveRecord(stag);
  }

  // Restore the arrival slot.
  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-03" });
  const arrival = findSlotByTitle(dao, thu.id, "Land at BCN → apartment");
  if (arrival) {
    arrival.set("note", "Aerobús from T1/T2 to Plaça Catalunya · €7.25 · 35 min, then 10 min walk. Or split taxis ~€35 each.");
    arrival.set("map_url", "");
    dao.saveRecord(arrival);
  }
});
