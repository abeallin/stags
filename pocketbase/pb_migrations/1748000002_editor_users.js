/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const usersCol = dao.findCollectionByNameOrId("users");

  const placeholderPassword = "CHANGE_ME_VIA_ADMIN_UI";

  for (const slug of ["bcn", "sthlm"]) {
    const email = `${slug}-editor@stags.local`;
    try {
      dao.findAuthRecordByEmail("users", email);
      // already exists, leave it
    } catch (_) {
      const user = new Record(usersCol, {
        email,
        username: `${slug}-editor`,
        emailVisibility: false,
        verified: true,
      });
      user.setPassword(placeholderPassword);
      dao.saveRecord(user);
    }
  }
}, (db) => {
  const dao = new Dao(db);
  for (const slug of ["bcn", "sthlm"]) {
    try {
      const u = dao.findAuthRecordByEmail("users", `${slug}-editor@stags.local`);
      dao.deleteRecord(u);
    } catch (_) {}
  }
});
