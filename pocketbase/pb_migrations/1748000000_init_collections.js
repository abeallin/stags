/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  // ─── stags ────────────────────────────────────────────────────────────
  const stags = new Collection({
    name: "stags",
    type: "base",
    schema: [
      { name: "slug",             type: "text", required: true, unique: true, options: { max: 32 } },
      { name: "name",             type: "text", required: true },
      { name: "start_date",       type: "date", required: true },
      { name: "end_date",         type: "date", required: true },
      { name: "accent_color",     type: "text" },
      { name: "eyebrow_text",     type: "text" },
      { name: "header_meta_html", type: "text" },
    ],
    listRule:   "",
    viewRule:   "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
  dao.saveCollection(stags);

  // ─── days ─────────────────────────────────────────────────────────────
  const days = new Collection({
    name: "days",
    type: "base",
    schema: [
      { name: "stag",       type: "relation", required: true,
        options: { collectionId: stags.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "date",       type: "date", required: true },
      { name: "title",      type: "text", required: true },
      { name: "subtitle",   type: "text" },
      { name: "sort_order", type: "number", required: true },
    ],
    indexes: ["CREATE INDEX idx_days_stag ON days (stag)"],
    listRule:   "",
    viewRule:   "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
  dao.saveCollection(days);

  // ─── slots ────────────────────────────────────────────────────────────
  const slots = new Collection({
    name: "slots",
    type: "base",
    schema: [
      { name: "day",         type: "relation", required: true,
        options: { collectionId: days.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "start_time",  type: "date",    required: true },
      { name: "time_label",  type: "text",    required: true },
      { name: "title",       type: "text",    required: true },
      { name: "note",        type: "text" },
      { name: "tags",        type: "json" },
      { name: "is_featured", type: "bool" },
      { name: "sort_order",  type: "number",  required: true },
    ],
    indexes: ["CREATE INDEX idx_slots_day ON slots (day)"],
    listRule:   "",
    viewRule:   "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
  dao.saveCollection(slots);

  // ─── edits ────────────────────────────────────────────────────────────
  const edits = new Collection({
    name: "edits",
    type: "base",
    schema: [
      { name: "stag",      type: "relation", required: true,
        options: { collectionId: stags.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "kind",      type: "text", required: true },
      { name: "target_id", type: "text", required: true },
      { name: "before",    type: "json" },
      { name: "after",     type: "json" },
      { name: "who",       type: "text", required: true },
    ],
    indexes: [
      "CREATE INDEX idx_edits_stag_created ON edits (stag, created DESC)"
    ],
    listRule:   "",
    viewRule:   "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
  dao.saveCollection(edits);

  // ─── presence ─────────────────────────────────────────────────────────
  const presence = new Collection({
    name: "presence",
    type: "base",
    schema: [
      { name: "stag",         type: "relation", required: true,
        options: { collectionId: stags.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "session_id",   type: "text", required: true, unique: true },
      { name: "display_name", type: "text", required: true },
      { name: "last_seen",    type: "date", required: true },
    ],
    indexes: ["CREATE INDEX idx_presence_stag ON presence (stag)"],
    listRule:   "",
    viewRule:   "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  });
  dao.saveCollection(presence);
}, (db) => {
  const dao = new Dao(db);
  for (const name of ["presence", "edits", "slots", "days", "stags"]) {
    try { dao.deleteCollection(dao.findCollectionByNameOrId(name)); } catch (_) {}
  }
});
