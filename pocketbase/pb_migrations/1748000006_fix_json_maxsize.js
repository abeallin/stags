/// <reference path="../pb_data/types.d.ts" />
// PocketBase 0.22's JSON field type defaults maxSize to 0 — which silently
// blocks ALL writes through the public API (Dao.saveRecord bypasses validation,
// which is why the seed migration succeeded). This sets a sensible 2MB cap on
// the three JSON fields we use: slots.tags, edits.before, edits.after.
//
// Implementation: AddField with the existing field's id REPLACES it in PB,
// preserving the SQLite column (and thus the seeded data) while updating
// the field options. Down migration would re-break writes so it's a no-op.

const TWO_MB = 2 * 1024 * 1024;

function bumpJsonMax(dao, collectionName, fieldName) {
  const col = dao.findCollectionByNameOrId(collectionName);
  const existing = col.schema.fields().find((f) => f.name === fieldName);
  if (!existing) return;
  col.schema.addField(new SchemaField({
    id:      existing.id,
    name:    existing.name,
    type:    "json",
    options: { maxSize: TWO_MB },
  }));
  dao.saveCollection(col);
}

migrate((db) => {
  const dao = new Dao(db);
  bumpJsonMax(dao, "slots", "tags");
  bumpJsonMax(dao, "edits", "before");
  bumpJsonMax(dao, "edits", "after");
}, (db) => {
  // No-op: reverting maxSize to 0 would re-break writes.
});
