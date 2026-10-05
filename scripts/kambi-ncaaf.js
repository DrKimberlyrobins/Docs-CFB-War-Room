// ============================================================
// DOC'S COLLEGE FOOTBALL WAR ROOM
// KAMBI NCAAF MARKET COLLECTOR
// ============================================================
//
// PURPOSE
// 1. Discover every current NCAAF event offered by Kambi.
// 2. Fetch the complete bet-offer response for each event.
// 3. Create a SMALL index file for the War Room.
// 4. Save ONE JSON file per event.
//
// IMPORTANT
// - No hard-coded event IDs.
// - No giant all-games market file.
// - ncid is intentionally omitted.
// - Existing College Football files are not touched.
//
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");


// ============================================================
// KAMBI SETTINGS
// ============================================================

const OFFERING =
  "pivusmsrl-bil";

const LANGUAGE =
  "en_US";

const MARKET =
  "US-MS";

const CLIENT_ID =
  "200";

const CHANNEL_ID =
  "7";


// ============================================================
// VERIFIED NCAAF DISCOVERY ENDPOINT
// ============================================================

const MATCHES_URL =
  `https://eu.offering-api.kambicdn.com/` +
  `offering/v2018/${OFFERING}/` +
  `listView/american_football/ncaaf/` +
  `all/all/matches.json` +
  `?lang=${LANGUAGE}` +
  `&market=${MARKET}` +
  `&client_id=${CLIENT_ID}` +
  `&channel_id=${CHANNEL_ID}` +
  `&useCombined=true` +
  `&useCombinedLive=true`;


// ============================================================
// OUTPUT PATHS
// ============================================================

const DATA_ROOT =
  path.join(
    process.cwd(),
    "data",
    "kambi"
  );

const EVENTS_DIR =
  path.join(
    DATA_ROOT,
    "events"
  );

const INDEX_FILE =
  path.join(
    DATA_ROOT,
    "ncaaf-index-2026.json"
  );


// ============================================================
// FILE HELPERS
// ============================================================

function ensureDirectories() {

  fs.mkdirSync(
    EVENTS_DIR,
    {
      recursive: true
    }
  );
}


function writeJson(
  filePath,
  data
) {

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      data,
      null,
      2
    ) + "\n",
    "utf8"
  );
}


// ============================================================
// HTTP
// ============================================================

async function fetchJson(url) {

  const response =
    await fetch(
      url,
      {
        headers: {
          "Accept":
            "application/json",

          "User-Agent":
            "Doc-CFB-War-Room/1.0"
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      `HTTP ${response.status} ` +
      `${response.statusText} ` +
      `for ${url}`
    );
  }


  return response.json();
}


// ============================================================
// EVENT URL
// ============================================================

function eventUrl(eventId) {

  return (
    `https://eu.offering-api.kambicdn.com/` +
    `offering/v2018/${OFFERING}/` +
    `betoffer/event/${eventId}.json` +
    `?lang=${LANGUAGE}` +
    `&market=${MARKET}` +
    `&client_id=${CLIENT_ID}` +
    `&channel_id=${CHANNEL_ID}` +
    `&includeParticipants=true`
  );
}


// ============================================================
// CLEAN EVENT NAME
// ============================================================

function cleanTeamName(value) {

  return String(value || "")
    .replace(
      /^\s*\(\d+\)\s*/,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function parseMatchup(eventName) {

  const raw =
    String(eventName || "")
      .trim();


  const parts =
    raw.split("@");


  if (parts.length !== 2) {

    return {
      away: "",
      home: ""
    };
  }


  return {
    away:
      cleanTeamName(
        parts[0]
      ),

    home:
      cleanTeamName(
        parts[1]
      )
  };
}


// ============================================================
// DISCOVER NCAAF EVENTS
// ============================================================

async function discoverEvents() {

  console.log(
    "\n============================================"
  );

  console.log(
    "DOC'S CFB WAR ROOM — KAMBI NCAAF"
  );

  console.log(
    "============================================\n"
  );


  console.log(
    "Fetching NCAAF event list..."
  );


  const data =
    await fetchJson(
      MATCHES_URL
    );


  if (
    !Array.isArray(
      data.events
    )
  ) {

    throw new Error(
      "Kambi response did not contain events[]."
    );
  }


  const discovered = [];


  for (
    const wrapper
    of data.events
  ) {

    const event =
      wrapper &&
      wrapper.event;


    if (!event) {
      continue;
    }


    const id =
      event.id;


    const name =
      String(
        event.name || ""
      ).trim();


    if (
      !id ||
      !name
    ) {
      continue;
    }


    const matchup =
      parseMatchup(name);


    discovered.push({

      id:
        String(id),

      name,

      away:
        matchup.away,

      home:
        matchup.home,

      start:
        event.start ||
        event.startTime ||
        event.start_time ||
        "",

      state:
        event.state || "",

      type:
        event.type || "",

      path:
        `events/${id}.json`
    });
  }


  console.log(
    `NCAAF events discovered: ` +
    `${discovered.length}`
  );


  for (
    const event
    of discovered
  ) {

    console.log(
      `${event.id} | ` +
      `${event.name}`
    );
  }


  return discovered;
}


// ============================================================
// FETCH ONE EVENT
// ============================================================

async function fetchEvent(
  discoveredEvent
) {

  const url =
    eventUrl(
      discoveredEvent.id
    );


  console.log(
    `\nFetching: ` +
    `${discoveredEvent.name}`
  );


  const raw =
    await fetchJson(url);


  const betOffers =
    Array.isArray(
      raw.betOffers
    )
      ? raw.betOffers
      : [];


  const events =
    Array.isArray(
      raw.events
    )
      ? raw.events
      : [];


  const prePacks =
    Array.isArray(
      raw.prePacks
    )
      ? raw.prePacks
      : [];


  const output = {

    generatedAt:
      new Date()
        .toISOString(),

    source:
      "Kambi",

    league:
      "NCAAF",

    event: {
      id:
        discoveredEvent.id,

      name:
        discoveredEvent.name,

      away:
        discoveredEvent.away,

      home:
        discoveredEvent.home,

      start:
        discoveredEvent.start
    },

    counts: {
      betOffers:
        betOffers.length,

      events:
        events.length,

      prePacks:
        prePacks.length
    },

    betOffers,

    events,

    prePacks
  };


  const outputFile =
    path.join(
      EVENTS_DIR,
      `${discoveredEvent.id}.json`
    );


  writeJson(
    outputFile,
    output
  );


  console.log(
    `Saved: ` +
    `data/kambi/events/` +
    `${discoveredEvent.id}.json`
  );


  console.log(
    `Bet offers: ` +
    `${betOffers.length}`
  );


  return {
    id:
      discoveredEvent.id,

    name:
      discoveredEvent.name,

    away:
      discoveredEvent.away,

    home:
      discoveredEvent.home,

    start:
      discoveredEvent.start,

    file:
      `data/kambi/events/` +
      `${discoveredEvent.id}.json`,

    betOfferCount:
      betOffers.length,

    status:
      "OK"
  };
}


// ============================================================
// MAIN
// ============================================================

async function main() {

  ensureDirectories();


  const discovered =
    await discoverEvents();


  if (!discovered.length) {

    throw new Error(
      "No NCAAF events were discovered."
    );
  }


  const processed = [];

  const skipped = [];


  for (
    const event
    of discovered
  ) {

    try {

      const result =
        await fetchEvent(
          event
        );


      processed.push(
        result
      );


      /*
        Small pause so we are not
        hammering the endpoint.
      */

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            125
          )
      );


    } catch (error) {

      console.error(
        `FAILED: ${event.name}`
      );

      console.error(
        error.message
      );


      skipped.push({

        id:
          event.id,

        name:
          event.name,

        reason:
          error.message
      });
    }
  }


  // ============================================================
  // SMALL INDEX / MANIFEST
  // ============================================================

  const index = {

    generatedAt:
      new Date()
        .toISOString(),

    source:
      "Kambi",

    league:
      "NCAAF",

    counts: {
      discovered:
        discovered.length,

      processed:
        processed.length,

      skipped:
        skipped.length
    },

    events:
      processed,

    skipped
  };


  writeJson(
    INDEX_FILE,
    index
  );


  // ============================================================
  // FINAL REPORT
  // ============================================================

  console.log(
    "\n============================================"
  );

  console.log(
    "KAMBI NCAAF REPORT"
  );

  console.log(
    "============================================"
  );


  console.log(
    `Events discovered: ` +
    `${discovered.length}`
  );


  console.log(
    `Events processed: ` +
    `${processed.length}`
  );


  console.log(
    `Events skipped: ` +
    `${skipped.length}`
  );


  console.log(
    `Index: ` +
    `data/kambi/ncaaf-index-2026.json`
  );


  console.log(
    `Event files: ` +
    `data/kambi/events/`
  );


  if (skipped.length) {

    console.log(
      "\nSKIPPED EVENTS"
    );


    for (
      const event
      of skipped
    ) {

      console.log(
        `${event.id} | ` +
        `${event.name} | ` +
        `${event.reason}`
      );
    }
  }


  console.log(
    "\nDone.\n"
  );
}


// ============================================================
// RUN
// ============================================================

main()
  .catch(error => {

    console.error(
      "\nKAMBI NCAAF COLLECTOR FAILED"
    );

    console.error(
      error
    );

    process.exit(1);
  });
