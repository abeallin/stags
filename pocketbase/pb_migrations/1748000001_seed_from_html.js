/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  const stagsData = [
    {
      slug: "bcn",
      name: "Barcelona 2026",
      start_date: "2026-06-03",
      end_date:   "2026-06-07",
      accent_color: "#c84a2c",
      eyebrow_text: "Stag · June 2026",
      header_meta_html: "<strong>3–7 June</strong> · 5 lads building to 8",
      days: [
        {
          date: "2026-06-03", title: "The arrival", subtitle: "",
          slots: [
            {
              start_time:  "2026-06-03T16:15",
              time_label:  "4:15pm · arrival",
              title:       "Land at BCN → apartment",
              note:        "Aerobús from T1/T2 to Plaça Catalunya · €7.25 · 35 min, then 10 min walk. Or split taxis ~€35 each.",
              tags:        [],
              is_featured: false,
            },
            {
              start_time:  "2026-06-03T20:00",
              time_label:  "8:00pm · dinner",
              title:       "Vivo Tapas",
              note:        "★ 4.8 · 22k reviews. Low-effort first-night feed right by the apartment.",
              tags:        [{ label: "3 min walk", kind: "walk" }],
              is_featured: false,
            },
            {
              start_time:  "2026-06-03T22:00",
              time_label:  "10:00pm · cocktails",
              title:       "Paradiso speakeasy",
              note:        "Enter through the pastrami fridge. Get there 9:30pm latest. One round, then El Born bars.",
              tags:        [{ label: "16 min walk", kind: "walk" }],
              is_featured: false,
            },
          ],
        },
        {
          date: "2026-06-04", title: "Primavera night", subtitle: "",
          slots: [
            {
              start_time:  "2026-06-04T11:00",
              time_label:  "11:00am · coffee + sights",
              title:       "Ripa Coffee + Passeig de Gràcia stroll",
              note:        "★ 4.9 coffee. Walk Passeig de Gràcia, photo at Casa Batlló & La Pedrera. Sleep-in friendly.",
              tags:        [{ label: "8 min walk", kind: "walk" }],
              is_featured: false,
            },
            {
              start_time:  "2026-06-04T13:00",
              time_label:  "1:00pm · tapas lunch",
              title:       "Cervecería Catalana",
              note:        "★ 4.4 · 24k reviews. The 2 latecomers join here. Then back to apartment for a nap.",
              tags:        [{ label: "5 min walk", kind: "walk" }],
              is_featured: false,
            },
            {
              start_time:  "2026-06-04T17:30",
              time_label:  "5:30pm → 5am · festival",
              title:       "Primavera Sound at Parc del Fòrum",
              note:        "Thu headliners: Doja Cat, Massive Attack, Bad Gyal. Gates open ~4pm. Runs to 5am. Metro L4 to El Maresme/Fòrum — easier than taxis (festival traffic is hell).\n\nBring: ticket on phone + battery pack + cash card + sunglasses + jumper for late. Lockers on site.",
              tags:        [{ label: "L4 metro", kind: "train" }],
              is_featured: true,
            },
          ],
        },
        {
          date: "2026-06-05", title: "Beach recovery", subtitle: "",
          slots: [
            {
              start_time:  "2026-06-05T12:00",
              time_label:  "12:00pm · late brunch",
              title:       "Faire. Brunch & Drinks",
              note:        "★ 4.8. Sleep-in friendly start. Sourdough avo eggs, fresh juices. Last lad joins here.",
              tags:        [{ label: "7 min walk", kind: "walk" }],
              is_featured: false,
            },
            {
              start_time:  "2026-06-05T14:00",
              time_label:  "2:00pm · beach day",
              title:       "Barceloneta beach",
              note:        "Pure hangover medicine. Find a chiringuito, beers and cervezas, nap on the sand, swim when you can muster it. Zero pressure, zero schedule.",
              tags:        [{ label: "8 min taxi", kind: "taxi" }],
              is_featured: true,
            },
            {
              start_time:  "2026-06-05T20:30",
              time_label:  "8:30pm · paella dinner",
              title:       "Xiringuito Escribà",
              note:        "Beachfront paella, ~10 min walk up the seafront from Barceloneta. Reservation essential for 8.",
              tags:        [{ label: "10 min along beach", kind: "walk" }, { label: "Book ahead", kind: "must" }],
              is_featured: false,
            },
            {
              start_time:  "2026-06-05T23:00",
              time_label:  "11:00pm · optional drinks",
              title:       "El Born cocktail crawl (if game)",
              note:        "Bestiari → Mariposa Negra → Especiarium. All within 3 min of each other. Or just home — Saturday's a proper day.",
              tags:        [],
              is_featured: false,
            },
          ],
        },
        {
          date: "2026-06-06", title: "Sitges + the finale", subtitle: "",
          slots: [
            {
              start_time:  "2026-06-06T10:30",
              time_label:  "10:30am · train south",
              title:       "R2 Sud → Sitges",
              note:        "€5 each way · 35–40 min · runs every 15–20 min from Passeig de Gràcia. Sit on the top deck, left side, for coastal views. Station is 10 min walk to the beach.",
              tags:        [{ label: "3 min walk to station", kind: "train" }],
              is_featured: true,
            },
            {
              start_time:  "2026-06-06T12:00",
              time_label:  "12:00pm · arrive + beach",
              title:       "San Sebastián beach",
              note:        "Smaller, less crowded than the main strip. Walk the promenade, find a spot, swim, lounge.",
              tags:        [],
              is_featured: false,
            },
            {
              start_time:  "2026-06-06T13:30",
              time_label:  "1:30pm · seafront lunch",
              title:       "Beachfront chiringuito",
              note:        "La Punta, Fragata, or any spot on Passeig de la Ribera. Paella, fresh fish, sangria. Pintxos at Izarra Taberna Vasca on Carrer Major if you want to bar-graze.",
              tags:        [],
              is_featured: false,
            },
            {
              start_time:  "2026-06-06T15:30",
              time_label:  "3:30pm · sailing tour",
              title:       "Sitges sail with cava",
              note:        "~1.5–2hrs, ~€30–50pp. Sail along the Sitges coast with cava. Book Wed/Thu on GetYourGuide — Saturdays in June sell out.",
              tags:        [{ label: "Book ahead", kind: "must" }],
              is_featured: true,
            },
            {
              start_time:  "2026-06-06T18:30",
              time_label:  "6:30pm · train back",
              title:       "R2 Sud → Passeig de Gràcia",
              note:        "Back at apartment ~7:15pm. Quick shower, change, big night incoming.",
              tags:        [],
              is_featured: false,
            },
            {
              start_time:  "2026-06-06T21:30",
              time_label:  "9:30pm · the big meal",
              title:       "Bar Cañete",
              note:        "★ 4.6 · 8k reviews. The centrepiece. Squid sandwich, croquetas, ox-tail bun.",
              tags:        [{ label: "8 min taxi", kind: "taxi" }, { label: "Book weeks ahead", kind: "must" }],
              is_featured: true,
            },
            {
              start_time:  "2026-06-07T00:00",
              time_label:  "midnight · final blow-out",
              title:       "El Born cocktails → Opium",
              note:        "Bestiari → Mariposa Negra → taxi to Opium beach club. Last big night, send him off properly.",
              tags:        [],
              is_featured: false,
            },
          ],
        },
        {
          date: "2026-06-07", title: "Home bound", subtitle: "",
          slots: [
            {
              start_time:  "2026-06-07T09:00",
              time_label:  "9:00am · checkout",
              title:       "Pack + bags down",
              note:        "Don't leave valuables in rooms during cleaning. Reception can hold bags if needed.",
              tags:        [],
              is_featured: false,
            },
            {
              start_time:  "2026-06-07T10:00",
              time_label:  "10:00am · brunch",
              title:       "Faire or Ripa · coffee + croissant",
              note:        "Light, fast, hangover-friendly. Close to base.",
              tags:        [],
              is_featured: false,
            },
            {
              start_time:  "2026-06-07T11:00",
              time_label:  "11:00am · airport",
              title:       "Aerobús from Plaça Catalunya",
              note:        "10 min walk · €7.25 · every 5–10 min · 35 min to BCN. Flight 2pm.",
              tags:        [],
              is_featured: false,
            },
          ],
        },
      ],
    },
    {
      slug: "sthlm",
      name: "Stockholm 2026",
      start_date: "2026-06-11",
      end_date:   "2026-06-14",
      accent_color: "#2c5f7c",
      eyebrow_text: "Stag · June 2026",
      header_meta_html: "<strong>11–14 June</strong>",
      days: [
        {
          date: "2026-06-11", title: "The arrival", subtitle: "",
          slots: [
            {
              start_time:  "2026-06-11T09:00",
              time_label:  "9–10am · LHR departure",
              title:       "Heathrow → Stockholm Arlanda",
              note:        "~2hr 40min flight + 1hr time difference = land ~1–2pm local. Arlanda Express train to Central Station (20 min, ~£26 return). Hotel is 2 min walk from there.",
              tags:        [],
              is_featured: false,
            },
            {
              start_time:  "2026-06-11T15:00",
              time_label:  "3:00pm · check in + walk",
              title:       "Scandic check-in → Old Town stroll",
              note:        "Drop bags, then walk south to Gamla Stan (Old Town). Stortorget square, Mårten Trotzigs gränd (Stockholm's narrowest street — 90cm wide), the Royal Palace. Sets the scene.",
              tags:        [{ label: "15 min walk", kind: "walk" }],
              is_featured: false,
            },
            {
              start_time:  "2026-06-11T19:30",
              time_label:  "7:30pm · Swedish classics",
              title:       "Lilla Gästabud",
              note:        "★ 4.9 · 582 reviews. Tiny intimate spot in Old Town — \"the best meatball sauce I've ever tasted,\" \"best meal we've had in a very long time.\" Reindeer meatballs, braised pork cheek, smoked fish. Small space — book in advance for a group of 4-6.\n\nBackup if full: Stockholms Gästabud (the bigger sister, ★ 4.7 · 6,500 reviews).",
              tags:        [{ label: "Gamla Stan · 10 min", kind: "walk" }, { label: "Book ahead", kind: "must" }],
              is_featured: true,
            },
            {
              start_time:  "2026-06-11T22:00",
              time_label:  "10:00pm · cocktails",
              title:       "Pharmarium",
              note:        "★ 4.4 · 1,600 reviews. Theatrical apothecary-themed cocktail bar on Stortorget square. Smoke, potions, all the bits. Expensive but a proper experience.",
              tags:        [{ label: "Gamla Stan", kind: "walk" }],
              is_featured: false,
            },
          ],
        },
        {
          date: "2026-06-12", title: "Sauna + sights + party", subtitle: "",
          slots: [
            {
              start_time:  "2026-06-12T09:00",
              time_label:  "9:00am · coffee + fika",
              title:       "Café Pascal",
              note:        "★ 4.5 · 2,500 reviews. Best coffee shop in Stockholm right now. Cardamom buns, pistachio danishes, the proper Swedish fika morning.",
              tags:        [{ label: "10 min walk", kind: "walk" }],
              is_featured: false,
            },
            {
              start_time:  "2026-06-12T10:30",
              time_label:  "10:30am · museum",
              title:       "Vasa Museum on Djurgården",
              note:        "★ 4.8 · 67,000 reviews. A 17th-century warship that sank on its maiden voyage, salvaged 333 years later, now in a custom museum. Genuinely jaw-dropping even if you don't do museums. Free audio guide app.",
              tags:        [{ label: "20 min tram/ferry", kind: "train" }],
              is_featured: false,
            },
            {
              start_time:  "2026-06-12T14:30",
              time_label:  "2:30pm · sauna + cold plunge",
              title:       "Sthlm Sauna Vinterviken",
              note:        "★ 4.9 · \"Stockholm's finest sauna.\" Lakeside, with cold dips in the lake itself. 2hr sessions. Properly Nordic.\n\nBackup if booked out: ASCARO Sauna in central NK Parkaden (5 min from hotel) — private bookings for groups of 6, sauna + ice bath.",
              tags:        [{ label: "25 min metro", kind: "train" }, { label: "Book ahead", kind: "must" }],
              is_featured: true,
            },
            {
              start_time:  "2026-06-12T20:00",
              time_label:  "8:00pm · phones away",
              title:       "Punk Royale",
              note:        "★ 4.6 · 1,100 reviews. They take your phone at the door. No menu — set tasting, vodka shots throughout, caviar, waiters with no filter. The most unhinged Michelin-tier meal in Stockholm. ~€150pp with drinks. \"You leave drunk, screaming with laughter, not sure what you ate.\"\n\nWhy this one: Friday is the party night — Punk Royale fits the energy and rolls straight into Trädgården after. The chaos is the point.",
              tags:        [{ label: "Södermalm · 15 min", kind: "taxi" }, { label: "Book NOW", kind: "must" }],
              is_featured: true,
            },
            {
              start_time:  "2026-06-12T23:00",
              time_label:  "11:00pm · cocktails",
              title:       "Othilia",
              note:        "★ 4.9 · 57 reviews. Hidden cocktail bar behind a Michelin restaurant. \"One of the best cocktail bars on the planet.\"",
              tags:        [{ label: "8 min walk", kind: "walk" }],
              is_featured: false,
            },
            {
              start_time:  "2026-06-13T01:00",
              time_label:  "1:00am · club",
              title:       "Trädgården",
              note:        "★ 4.0 · 1,200 reviews. Open-air club under a bridge in Hammarby. Multiple DJ areas, food trucks, basketball court inside, swings between zones. Genuinely unique. Only open Fri/Sat in summer.",
              tags:        [{ label: "15 min taxi", kind: "taxi" }],
              is_featured: false,
            },
          ],
        },
        {
          date: "2026-06-13", title: "Archipelago + finale", subtitle: "",
          slots: [
            {
              start_time:  "2026-06-13T08:00",
              time_label:  "heads up",
              title:       "Royal Golden Wedding day",
              note:        "It's the King & Queen's 50th anniversary. Royal procession through the city, open-air concert in Kungsträdgården (literally 5 min from your hotel), road closures, huge crowds. Plus Foo Fighters at Strawberry Arena = the entire city is partying. Restaurants will be SLAMMED — book everything in advance.",
              tags:        [],
              is_featured: true,
            },
            {
              start_time:  "2026-06-13T10:00",
              time_label:  "10:00am · slow brunch",
              title:       "Hotel breakfast or Komet Café",
              note:        "Easy start. Komet Café (★ 4.8) for a proper bakery experience nearby if hotel breakfast is mid.",
              tags:        [],
              is_featured: false,
            },
            {
              start_time:  "2026-06-13T12:00",
              time_label:  "12:00pm · archipelago tour",
              title:       "Stockholm Archipelago Summer Ride",
              note:        "★ 4.9 · 179 reviews. 2.5-hour boat through ~5 islands, commentary in English, Swedish charcuterie on board. Departs Skeppsbrokajen near Old Town. Beautiful, easy, doesn't kill the whole day.\n\nIf you want private: Stockholm Boat Tour (★ 4.7) — Gustav runs private group charters from Strandvägskajen, 2-8 hour options, swim stops, lunch on islands. Can book day-before.",
              tags:        [{ label: "2.5hr cruise", kind: "info" }, { label: "Book ahead", kind: "must" }],
              is_featured: true,
            },
            {
              start_time:  "2026-06-13T15:30",
              time_label:  "3:30pm · activity",
              title:       "Mad Axe Throwing Club",
              note:        "★ 4.5 · Central, walking distance from hotel. Mike runs the safety briefing, lanes for the group, properly competitive. 90 min session. Book ahead for Saturday.",
              tags:        [{ label: "10 min walk", kind: "walk" }],
              is_featured: false,
            },
            {
              start_time:  "2026-06-13T20:00",
              time_label:  "8:00pm · the finale",
              title:       "Adam/Albin",
              note:        "★ 4.8 · 664 reviews · Michelin-starred. The most consistent rave reviews in Stockholm — \"the most worthwhile Michelin-starred tasting menu I have experienced,\" \"if I could, I would award this place two Michelin stars today.\" ~€180pp. Warm, engaging service. The proper send-off meal.\n\nIf Adam/Albin is full: Ekstedt (★ 4.7 · Michelin) — everything cooked over open fire, refined and beautiful. Or Nour (★ 4.7) — Japanese-Swedish, 9 courses, hidden gem.",
              tags:        [{ label: "8 min walk", kind: "walk" }, { label: "Book WEEKS ahead", kind: "must" }],
              is_featured: true,
            },
            {
              start_time:  "2026-06-13T23:30",
              time_label:  "11:30pm · final night",
              title:       "Bar Lilla Compagniet → Trädgården",
              note:        "Lilla Compagniet (★ 4.7) for a proper cocktail in Södermalm, then back to Trädgården if anyone has anything left in the tank.",
              tags:        [{ label: "Taxi between", kind: "taxi" }],
              is_featured: false,
            },
          ],
        },
        {
          date: "2026-06-14", title: "Home bound", subtitle: "",
          slots: [
            {
              start_time:  "2026-06-14T10:00",
              time_label:  "10:00am · slow morning",
              title:       "Hotel breakfast + pack",
              note:        "Reception can hold bags after checkout if flight isn't till later. What time's the flight back?",
              tags:        [],
              is_featured: false,
            },
            {
              start_time:  "2026-06-14T12:00",
              time_label:  "12:00pm · last hurrah",
              title:       "Lunch at Café Pascal or Komet",
              note:        "Proper cardamom bun + filter coffee on the way out. The Stockholm send-off.",
              tags:        [],
              is_featured: false,
            },
            {
              start_time:  "2026-06-14T14:00",
              time_label:  "to airport",
              title:       "Arlanda Express",
              note:        "From Stockholm Central (next to hotel) · 20 min · ~£26 return · runs every 15 min. Way better than the Aerobus or taxi.",
              tags:        [],
              is_featured: false,
            },
          ],
        },
      ],
    },
  ];

  for (const stagData of stagsData) {
    // Skip if stag already exists (idempotent)
    let stag;
    try {
      stag = dao.findFirstRecordByData("stags", "slug", stagData.slug);
    } catch (_) {
      const stagCol = dao.findCollectionByNameOrId("stags");
      stag = new Record(stagCol, {
        slug: stagData.slug,
        name: stagData.name,
        start_date: stagData.start_date,
        end_date:   stagData.end_date,
        accent_color: stagData.accent_color,
        eyebrow_text: stagData.eyebrow_text,
        header_meta_html: stagData.header_meta_html,
      });
      dao.saveRecord(stag);
    }

    const dayCol  = dao.findCollectionByNameOrId("days");
    const slotCol = dao.findCollectionByNameOrId("slots");

    let dayOrder = 0;
    for (const d of stagData.days) {
      let day;
      try {
        day = dao.findFirstRecordByFilter(
          "days",
          "stag = {:stag} && date = {:date}",
          { stag: stag.id, date: d.date }
        );
      } catch (_) {
        day = new Record(dayCol, {
          stag: stag.id,
          date: d.date,
          title: d.title,
          subtitle: d.subtitle || "",
          sort_order: dayOrder,
        });
        dao.saveRecord(day);
      }
      dayOrder++;

      let slotOrder = 0;
      for (const s of d.slots) {
        const existing = dao.findRecordsByFilter(
          "slots",
          "day = {:day} && sort_order = {:so}",
          "",
          1, 0,
          { day: day.id, so: slotOrder }
        );
        if (existing.length === 0) {
          const slot = new Record(slotCol, {
            day:         day.id,
            start_time:  s.start_time,
            time_label:  s.time_label,
            title:       s.title,
            note:        s.note,
            tags:        s.tags,
            is_featured: !!s.is_featured,
            sort_order:  slotOrder,
          });
          dao.saveRecord(slot);
        }
        slotOrder++;
      }
    }
  }
}, (db) => {
  const dao = new Dao(db);
  for (const slug of ["bcn", "sthlm"]) {
    try {
      const stag = dao.findFirstRecordByData("stags", "slug", slug);
      dao.deleteRecord(stag); // cascade deletes days + slots
    } catch (_) {}
  }
});
