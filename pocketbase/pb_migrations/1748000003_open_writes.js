/// <reference path="../pb_data/types.d.ts" />
// Removes the authenticated-write requirement on stags/days/slots/edits.
// Writes become public — anyone with the URL can edit. By design: the URL
// is shared only with the stag groups, and edit history + undo provide a
// safety net if anyone fat-fingers a change.
migrate((db) => {
  const dao = new Dao(db);
  for (const name of ["stags", "days", "slots", "edits"]) {
    const col = dao.findCollectionByNameOrId(name);
    col.createRule = "";
    col.updateRule = "";
    col.deleteRule = "";
    dao.saveCollection(col);
  }
}, (db) => {
  const dao = new Dao(db);
  for (const name of ["stags", "days", "slots", "edits"]) {
    const col = dao.findCollectionByNameOrId(name);
    col.createRule = "@request.auth.id != ''";
    col.updateRule = "@request.auth.id != ''";
    col.deleteRule = "@request.auth.id != ''";
    dao.saveCollection(col);
  }
});
