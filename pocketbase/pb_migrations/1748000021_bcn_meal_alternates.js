/// <reference path="../pb_data/types.d.ts" />
// BCN add inline alternates to the breakfast + lunch slots:
//   Thu Ripa Coffee  — add Café Pendiente (Rosselló 152, basically on our
//                       block) and Billy Brunch (Bailèn 115) as backup
//                       breakfast options.
//   Thu Cervecería Catalana — add Secret Tapes and La Alcoba Azul (Gothic
//                              Quarter candlelit tapas) as backup lunches.
//   Sun "Faire or Ripa" — same breakfast alternates for the way out.
//
// Appended to the existing notes; idempotent against the alternate-block
// marker so re-runs don't duplicate.

const STHLM_OR_BCN = "bcn";
const MARKER = "Backup options:";

function findSlotByTitle(dao, dayId, title) {
  try {
    return dao.findFirstRecordByFilter("slots",
      "day = {:day} && title = {:title}",
      { day: dayId, title: title });
  } catch (_) { return null; }
}

function appendAlternates(dao, dayId, title, block) {
  const slot = findSlotByTitle(dao, dayId, title);
  if (!slot) return false;
  const note = slot.get("note") || "";
  if (note.includes(MARKER)) return false;   // already appended
  slot.set("note", note.trimEnd() + "\n\n" + block);
  dao.saveRecord(slot);
  return true;
}

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM_OR_BCN); }
  catch (_) {
    console.log("[1748000021_bcn_meal_alternates] bcn stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-04" });
  const sun = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-07" });

  const breakfastBlock =
    MARKER + " Café Pendiente (Rosselló 152, basically on our block — brunch, " +
    "coffee, easy walk from the apartment). Or Billy Brunch (Bailèn 115, " +
    "Eixample) — all-day breakfast 9:30am–5pm, no reservations, classic " +
    "English / eggs benedict / shakshuka / pancakes, group-friendly.";

  const lunchBlock =
    MARKER + " Secret Tapes (small intimate tapas spot — book ahead) or " +
    "La Alcoba Azul (Gothic Quarter, Carrer de Sant Domenec del Call — " +
    "candlelit stone-walled tapas, Moorish/Andalucía vibe; open from 9:30am).";

  appendAlternates(dao, thu.id, "Ripa Coffee + Passeig de Gràcia stroll", breakfastBlock);
  appendAlternates(dao, thu.id, "Cervecería Catalana", lunchBlock);
  appendAlternates(dao, sun.id, "Faire or Ripa · coffee + croissant", breakfastBlock);

  console.log("[1748000021_bcn_meal_alternates] breakfast + lunch alternates appended");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", STHLM_OR_BCN); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-04" });
  const sun = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-07" });

  function stripBackup(dayId, title) {
    const slot = findSlotByTitle(dao, dayId, title);
    if (!slot) return;
    const note = slot.get("note") || "";
    const idx = note.indexOf("\n\n" + MARKER);
    if (idx === -1) return;
    slot.set("note", note.slice(0, idx).trimEnd());
    dao.saveRecord(slot);
  }

  stripBackup(thu.id, "Ripa Coffee + Passeig de Gràcia stroll");
  stripBackup(thu.id, "Cervecería Catalana");
  stripBackup(sun.id, "Faire or Ripa · coffee + croissant");
});
