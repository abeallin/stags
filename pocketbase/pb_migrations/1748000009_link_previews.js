/// <reference path="../pb_data/types.d.ts" />
// Server-side cache for microlink.io previews so we don't hammer their free
// tier (~50 req/day/IP) every time a new lad opens the URL. First lad pays
// the microlink cost once per URL, subsequent reads come from PocketBase.
//
// Three-tier in the frontend: localStorage (per-device) → this collection
// (shared) → microlink (last resort, gated by a circuit breaker).
//
// All rules open: any anonymous client can write so the first visitor can
// populate the cache. URL has a unique index so concurrent writes don't
// produce duplicates.

migrate((db) => {
  const dao = new Dao(db);
  const col = new Collection({
    name: "link_previews",
    type: "base",
    schema: [
      { name: "url",         type: "url",  required: true, options: { maxSize: 2048 } },
      { name: "title",       type: "text", options: { max: 500 } },
      { name: "description", type: "text", options: { max: 2000 } },
      { name: "image",       type: "url",  options: { maxSize: 2048 } },
      { name: "publisher",   type: "text", options: { max: 200 } },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_link_previews_url ON link_previews (url)",
    ],
    listRule:   "",
    viewRule:   "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  });
  dao.saveCollection(col);
}, (db) => {
  const dao = new Dao(db);
  try { dao.deleteCollection(dao.findCollectionByNameOrId("link_previews")); } catch (_) {}
});
