/// <reference path="../pb_data/types.d.ts" />
// BCN Thu 4 Jun: swap Cervecería Catalana (Thu 1pm tapas lunch) → Secret
// Tapes (Enric Granados 122). Same Eixample neighbourhood as the apartment,
// ~5 min walk, group-friendly intimate room — preserves the post-lunch nap
// flow Cervecería Catalana was chosen for.
//
// La Alcoba Azul stays as inline backup (Gothic Quarter, 25 min away, kept
// only as a "different vibe" pivot, not the primary).
//
// Idempotent: matches by old title and bails once swapped.

function findSlotByTitle(dao, dayId, title) {
  try {
    return dao.findFirstRecordByFilter("slots",
      "day = {:day} && title = {:title}",
      { day: dayId, title: title });
  } catch (_) { return null; }
}

function swapSlot(dao, dayId, oldTitle, data) {
  const slot = findSlotByTitle(dao, dayId, oldTitle);
  if (!slot) return false;
  slot.set("start_time",  data.start_time);
  slot.set("time_label",  data.time_label);
  slot.set("title",       data.title);
  slot.set("note",        data.note);
  slot.set("tags",        data.tags || []);
  if (typeof data.is_featured === "boolean") slot.set("is_featured", data.is_featured);
  slot.set("map_url",     data.map_url || "");
  slot.set("website_url", data.website_url || "");
  dao.saveRecord(slot);
  return true;
}

migrate((db) => {
  const dao = new Dao(db);

  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); }
  catch (_) {
    console.log("[1748000022_bcn_secret_tapes_replaces_catalana] bcn stag not found, skipping");
    return;
  }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-04" });

  swapSlot(dao, thu.id, "Cervecería Catalana", {
    start_time:  "2026-06-04T13:00:00",
    time_label:  "1:00pm · tapas lunch",
    title:       "Secret Tapes",
    note:        "Curated Eixample tapas room at Enric Granados 122, ~5 min walk from the apartment. Intimate-but-group-friendly, small terrace, the kind of careful Spanish menu that lands harder than Cervecería Catalana's busy churn. The 2 latecomers join here. Then back to the apartment for a nap before Primavera.\n\nBook ahead — small room, lunch fills fast.\n\nBackup options: La Alcoba Azul (Gothic Quarter, candlelit stone-walled tapas — 25 min walk south, so only if we're skipping the nap and drifting back through Born).",
    tags:        [{ label: "Enric Granados · 5 min", kind: "walk" }, { label: "Book ahead", kind: "must" }],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" +
                 encodeURIComponent("Secret Tapas Enric Granados Barcelona"),
    website_url: "https://secret-tapes.com/",
  });

  console.log("[1748000022_bcn_secret_tapes_replaces_catalana] Cervecería Catalana → Secret Tapes");
}, (db) => {
  const dao = new Dao(db);
  let stag;
  try { stag = dao.findFirstRecordByData("stags", "slug", "bcn"); } catch (_) { return; }

  const thu = dao.findFirstRecordByFilter("days",
    "stag = {:stag} && date ~ {:date}",
    { stag: stag.id, date: "2026-06-04" });

  swapSlot(dao, thu.id, "Secret Tapes", {
    start_time:  "2026-06-04T13:00:00",
    time_label:  "1:00pm · tapas lunch",
    title:       "Cervecería Catalana",
    note:        "★ 4.4 · 24k reviews. The 2 latecomers join here. Then back to apartment for a nap.\n\nBackup options: Secret Tapes (small intimate tapas spot — book ahead) or La Alcoba Azul (Gothic Quarter, Carrer de Sant Domenec del Call — candlelit stone-walled tapas, Moorish/Andalucía vibe; open from 9:30am).",
    tags:        [{ label: "5 min walk", kind: "walk" }],
    is_featured: false,
    map_url:     "https://www.google.com/maps/search/?api=1&query=" +
                 encodeURIComponent("Cervecería Catalana Barcelona"),
    website_url: "",
  });
});
