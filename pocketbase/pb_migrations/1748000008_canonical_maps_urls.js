/// <reference path="../pb_data/types.d.ts" />
// The earlier backfills wrote map_url values in the legacy
// `https://maps.google.com/?cid=NNN` form. Those CIDs were extracted from
// source HTMLs and several no longer resolve — clicking through lands on a
// blank Google Maps instead of the place.
//
// Replace every known slot's map_url with Google's documented Maps Search URL
// (https://developers.google.com/maps/documentation/urls/get-started):
//   https://www.google.com/maps/search/?api=1&query=NAME+CITY
//
// This is the canonical pattern Google maintains for "open this place name in
// Maps" — guaranteed to resolve to the top search result. Idempotent: skips
// rows whose URL already matches.

const SLOTS = [
  // BCN
  { stag: "bcn",   date: "2026-06-03", title: "Vivo Tapas",                               query: "Vivo Tapas Barcelona" },
  { stag: "bcn",   date: "2026-06-03", title: "Paradiso speakeasy",                       query: "Paradiso Barcelona El Born" },
  { stag: "bcn",   date: "2026-06-04", title: "Ripa Coffee + Passeig de Gràcia stroll",   query: "Ripa Coffee Barcelona" },
  { stag: "bcn",   date: "2026-06-04", title: "Cervecería Catalana",                      query: "Cervecería Catalana Barcelona" },
  { stag: "bcn",   date: "2026-06-04", title: "Primavera Sound at Parc del Fòrum",        query: "Parc del Fòrum Barcelona" },
  { stag: "bcn",   date: "2026-06-05", title: "Faire. Brunch & Drinks",                   query: "Faire Brunch and Drinks Barcelona" },
  { stag: "bcn",   date: "2026-06-05", title: "Barceloneta beach",                        query: "Barceloneta Beach Barcelona" },
  { stag: "bcn",   date: "2026-06-05", title: "Xiringuito Escribà",                       query: "Xiringuito Escribà Barceloneta" },
  { stag: "bcn",   date: "2026-06-06", title: "R2 Sud → Sitges",                          query: "Passeig de Gràcia Station Barcelona" },
  { stag: "bcn",   date: "2026-06-06", title: "San Sebastián beach",                      query: "Platja de Sant Sebastià Sitges" },
  { stag: "bcn",   date: "2026-06-06", title: "R2 Sud → Passeig de Gràcia",               query: "Sitges Train Station" },
  { stag: "bcn",   date: "2026-06-06", title: "Bar Cañete",                               query: "Bar Cañete Barcelona" },
  { stag: "bcn",   date: "2026-06-06", title: "El Born cocktails → Opium",                query: "Opium Barcelona club" },
  { stag: "bcn",   date: "2026-06-07", title: "Faire or Ripa · coffee + croissant",       query: "Faire Brunch and Drinks Barcelona" },
  { stag: "bcn",   date: "2026-06-07", title: "Aerobús from Plaça Catalunya",             query: "Aerobús Plaça Catalunya Barcelona" },

  // STHLM
  { stag: "sthlm", date: "2026-06-11", title: "Scandic check-in → Old Town stroll",       query: "Scandic Continental Stockholm" },
  { stag: "sthlm", date: "2026-06-11", title: "Lilla Gästabud",                           query: "Lilla Gästabud Stockholm" },
  { stag: "sthlm", date: "2026-06-11", title: "Pharmarium",                               query: "Pharmarium Stockholm" },
  { stag: "sthlm", date: "2026-06-12", title: "Café Pascal",                              query: "Café Pascal Stockholm" },
  { stag: "sthlm", date: "2026-06-12", title: "Vasa Museum on Djurgården",                query: "Vasa Museum Stockholm" },
  { stag: "sthlm", date: "2026-06-12", title: "Sthlm Sauna Vinterviken",                  query: "STHLM Sauna Vinterviken" },
  { stag: "sthlm", date: "2026-06-12", title: "Punk Royale",                              query: "Punk Royale Stockholm" },
  { stag: "sthlm", date: "2026-06-12", title: "Othilia",                                  query: "Othilia bar Stockholm" },
  { stag: "sthlm", date: "2026-06-12", title: "Trädgården",                               query: "Trädgården Stockholm" },
  { stag: "sthlm", date: "2026-06-13", title: "Hotel breakfast or Komet Café",            query: "Komet Café Stockholm" },
  { stag: "sthlm", date: "2026-06-13", title: "Stockholm Archipelago Summer Ride",        query: "Stockholm Archipelago Summer Ride Skeppsbrokajen" },
  { stag: "sthlm", date: "2026-06-13", title: "Mad Axe Throwing Club",                    query: "Mad Axe Throwing Club Stockholm" },
  { stag: "sthlm", date: "2026-06-13", title: "Adam/Albin",                               query: "Adam Albin Restaurant Stockholm" },
  { stag: "sthlm", date: "2026-06-13", title: "Bar Lilla Compagniet → Trädgården",        query: "Bar Lilla Compagniet Stockholm" },
  { stag: "sthlm", date: "2026-06-14", title: "Arlanda Express",                          query: "Stockholm Central Station Arlanda Express" },
];

function buildUrl(query) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

migrate((db) => {
  const dao = new Dao(db);
  let updated = 0;
  for (const row of SLOTS) {
    let stag;
    try { stag = dao.findFirstRecordByData("stags", "slug", row.stag); }
    catch (_) { continue; }

    let day;
    try {
      day = dao.findFirstRecordByFilter("days",
        "stag = {:stag} && date ~ {:date}",
        { stag: stag.id, date: row.date });
    } catch (_) { continue; }

    let slot;
    try {
      slot = dao.findFirstRecordByFilter("slots",
        "day = {:day} && title = {:title}",
        { day: day.id, title: row.title });
    } catch (_) { continue; }

    const url = buildUrl(row.query);
    if (slot.get("map_url") === url) continue;

    slot.set("map_url", url);
    dao.saveRecord(slot);
    updated++;
  }
  console.log("[1748000008_canonical_maps_urls] rebuilt " + updated + " map_url values");
}, (db) => {
  // No-op: leave canonical URLs in place on rollback.
});
