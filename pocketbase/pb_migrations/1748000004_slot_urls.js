/// <reference path="../pb_data/types.d.ts" />
// Adds map_url + website_url to slots and backfills the 22 venues that
// the original source HTMLs had curated links for. Extracted by
// pocketbase/_extract_urls.py \u2014 see that script if you ever need to
// re-derive from updated source HTMLs.

const SLOT_URLS = [
  {"stag":"bcn","date":"2026-06-03","title":"Vivo Tapas","map_url":"https://maps.google.com/?cid=13177602170648384505","website_url":"https://vivotapas.com/"},
  {"stag":"bcn","date":"2026-06-03","title":"Paradiso speakeasy","map_url":"https://maps.google.com/?cid=11787371834999161204","website_url":"https://paradiso.cat/"},
  {"stag":"bcn","date":"2026-06-04","title":"Ripa Coffee + Passeig de Gr\u00e0cia stroll","map_url":"https://maps.google.com/?cid=16601903211269173757","website_url":null},
  {"stag":"bcn","date":"2026-06-04","title":"Cervecer\u00eda Catalana","map_url":"https://maps.google.com/?cid=7860387390770853690","website_url":null},
  {"stag":"bcn","date":"2026-06-05","title":"Faire. Brunch & Drinks","map_url":"https://maps.google.com/?cid=13909965794466410091","website_url":null},
  {"stag":"bcn","date":"2026-06-05","title":"Xiringuito Escrib\u00e0","map_url":"https://maps.google.com/?cid=11670256638466811660","website_url":"https://restaurantsescriba.com/"},
  {"stag":"bcn","date":"2026-06-06","title":"Bar Ca\u00f1ete","map_url":"https://maps.google.com/?cid=2051304937619323747","website_url":null},
  {"stag":"bcn","date":"2026-06-06","title":"El Born cocktails \u2192 Opium","map_url":"https://maps.google.com/?cid=15803368006927918052","website_url":null},
  {"stag":"sthlm","date":"2026-06-11","title":"Scandic check-in \u2192 Old Town stroll","map_url":"https://maps.google.com/?cid=8133603484823352182","website_url":null},
  {"stag":"sthlm","date":"2026-06-11","title":"Lilla G\u00e4stabud","map_url":"https://maps.google.com/?cid=14252948070317293264","website_url":null},
  {"stag":"sthlm","date":"2026-06-11","title":"Pharmarium","map_url":"https://maps.google.com/?cid=12907423862175823033","website_url":null},
  {"stag":"sthlm","date":"2026-06-12","title":"Caf\u00e9 Pascal","map_url":"https://maps.google.com/?cid=13938935632050241102","website_url":null},
  {"stag":"sthlm","date":"2026-06-12","title":"Vasa Museum on Djurg\u00e5rden","map_url":"https://maps.google.com/?cid=15001480060569842497","website_url":null},
  {"stag":"sthlm","date":"2026-06-12","title":"Sthlm Sauna Vinterviken","map_url":"https://maps.google.com/?cid=12570858418257666490","website_url":null},
  {"stag":"sthlm","date":"2026-06-12","title":"Punk Royale","map_url":"https://maps.google.com/?cid=13895090340820575831","website_url":null},
  {"stag":"sthlm","date":"2026-06-12","title":"Othilia","map_url":"https://maps.google.com/?cid=13170148823060611521","website_url":null},
  {"stag":"sthlm","date":"2026-06-12","title":"Tr\u00e4dg\u00e5rden","map_url":"https://maps.google.com/?cid=14193275193080037803","website_url":null},
  {"stag":"sthlm","date":"2026-06-13","title":"Hotel breakfast or Komet Caf\u00e9","map_url":"https://maps.google.com/?cid=37822540094317449","website_url":null},
  {"stag":"sthlm","date":"2026-06-13","title":"Stockholm Archipelago Summer Ride","map_url":"https://maps.google.com/?cid=3070067614168175220","website_url":null},
  {"stag":"sthlm","date":"2026-06-13","title":"Mad Axe Throwing Club","map_url":"https://maps.google.com/?cid=12860780055994630621","website_url":null},
  {"stag":"sthlm","date":"2026-06-13","title":"Adam/Albin","map_url":"https://maps.google.com/?cid=8504732769540276356","website_url":null},
  {"stag":"sthlm","date":"2026-06-13","title":"Bar Lilla Compagniet \u2192 Tr\u00e4dg\u00e5rden","map_url":"https://maps.google.com/?cid=2291945023929109314","website_url":null},
];

migrate((db) => {
  const dao = new Dao(db);

  // Schema: add map_url and website_url to slots if not present
  const slots = dao.findCollectionByNameOrId("slots");
  const hasField = (name) => slots.schema.fields().some((f) => f.name === name);
  if (!hasField("map_url")) {
    slots.schema.addField(new SchemaField({ name: "map_url",     type: "url" }));
  }
  if (!hasField("website_url")) {
    slots.schema.addField(new SchemaField({ name: "website_url", type: "url" }));
  }
  dao.saveCollection(slots);

  // Backfill: look up each slot by (stag.slug, day.date, slot.title) and update
  let updated = 0;
  for (const row of SLOT_URLS) {
    let stag;
    try { stag = dao.findFirstRecordByData("stags", "slug", row.stag); }
    catch (_) { continue; }

    let day;
    try {
      day = dao.findFirstRecordByFilter("days",
        "stag = {:stag} && date = {:date}",
        { stag: stag.id, date: row.date });
    } catch (_) { continue; }

    let slot;
    try {
      slot = dao.findFirstRecordByFilter("slots",
        "day = {:day} && title = {:title}",
        { day: day.id, title: row.title });
    } catch (_) { continue; }

    let dirty = false;
    if (row.map_url && slot.get("map_url") !== row.map_url) {
      slot.set("map_url", row.map_url);
      dirty = true;
    }
    if (row.website_url && slot.get("website_url") !== row.website_url) {
      slot.set("website_url", row.website_url);
      dirty = true;
    }
    if (dirty) {
      dao.saveRecord(slot);
      updated++;
    }
  }
  console.log("[1748000004_slot_urls] backfilled " + updated + " slots");
}, (db) => {
  // Down migration: clear the values + drop the columns
  const dao = new Dao(db);
  const slots = dao.findCollectionByNameOrId("slots");
  for (const name of ["map_url", "website_url"]) {
    const field = slots.schema.fields().find((f) => f.name === name);
    if (field) slots.schema.removeField(field.id);
  }
  dao.saveCollection(slots);
});
