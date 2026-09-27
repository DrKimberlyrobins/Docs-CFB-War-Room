
// Doc's CFB War Room — Line Movement Tracker
(() => {
  "use strict";

  let games = [];
  let loaded = false;
  let loadError = false;

  const aliases = {
    "miami (fl)": "miami",
    "miami (florida)": "miami",
    "ole miss": "mississippi",
    "mississippi": "mississippi",
    "utsa": "utsa",
    "texas san antonio": "utsa",
    "smu": "smu",
    "southern methodist": "smu",
    "byu": "byu",
    "brigham young": "byu",
    "ucf": "ucf",
    "central florida": "ucf",
    "uconn": "connecticut",
    "connecticut": "connecticut",
    "umass": "massachusetts",
    "massachusetts": "massachusetts",
    "southern miss": "southern miss",
    "southern mississippi": "southern miss"
  };

  function normalize(name) {
    const key = String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return aliases[key] || key;
  }

  const hasNumber = n =>
    typeof n === "number" && Number.isFinite(n);

  const fmt = n => hasNumber(n)
    ? String(n)
    : "Unavailable";

  const pointLabel = n =>
    Math.abs(n) === 1 ? "point" : "points";

  function makeCell(row, value, heading = false) {
    const cell = document.createElement(
      heading ? "th" : "td"
    );
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
  }

  function show() {
    const panel = document.getElementById("oddsPanel");
    const status = document.getElementById("oddsStatus");
    const output = document.getElementById("oddsTables");

    if (!panel || !status || !output) return;

    panel.style.display = "block";
    output.replaceChildren();

    const away = document.getElementById("away")?.value;
    const home = document.getElementById("home")?.value;

    if (!away || !home || away === home) {
      status.textContent = "Select two different teams.";
      return;
    }

    if (loadError) {
      status.textContent =
        "Odds data could not be loaded. Your statistics are unaffected.";
      return;
    }

    if (!loaded) {
      status.textContent = "Loading available betting lines...";
      return;
    }

    const matches = games.filter(g =>
      normalize(g.awayTeam) === normalize(away) &&
      normalize(g.homeTeam) === normalize(home)
    );

    if (!matches.length) {
      status.textContent =
        "No matching betting lines for this home/away matchup.";
      return;
    }

    const sorted = matches
      .filter(g => !Number.isNaN(Date.parse(g.startDate)))
      .sort((a, b) =>
        Date.parse(a.startDate) - Date.parse(b.startDate)
      );

    const now = Date.now();

    const game =
      sorted.find(g => Date.parse(g.startDate) >= now) ||
      sorted[sorted.length - 1] ||
      matches[0];

    const date = new Date(game.startDate);

    status.textContent =
      `${game.awayTeam} at ${game.homeTeam}` +
      ` | Week ${game.week ?? "?"}` +
      (Number.isNaN(date.getTime())
        ? ""
        : ` | ${date.toLocaleDateString()}`);

    if (!Array.isArray(game.lines) || !game.lines.length) {
      const p = document.createElement("p");
      p.textContent = "No sportsbook lines reported.";
      output.appendChild(p);
      return;
    }

    game.lines.forEach(line => {
      const heading = document.createElement("h3");
      heading.textContent =
        line.provider || "Unknown sportsbook";
      output.appendChild(heading);

      const wrap = document.createElement("div");
      wrap.className = "table-wrap";

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const header = document.createElement("tr");

      [
        "Market",
        "Opening",
        "Recorded",
        "Change since opening"
      ].forEach(s => makeCell(header, s, true));

      thead.appendChild(header);
      table.appendChild(thead);

      const body = document.createElement("tbody");

      const spreadRow = document.createElement("tr");

      makeCell(spreadRow, `${game.homeTeam} spread`);
      makeCell(spreadRow, fmt(line.spreadOpen));
      makeCell(spreadRow, fmt(line.spread));

      let spreadChange = "Unavailable";

      if (
        hasNumber(line.spreadOpen) &&
        hasNumber(line.spread)
      ) {
        const delta = Math.round(
          (line.spread - line.spreadOpen) * 100
        ) / 100;

        spreadChange = delta === 0
          ? "No change"
          : `${Math.abs(delta)} ${pointLabel(delta)} toward ${
              delta < 0 ? game.homeTeam : game.awayTeam
            }`;
      }

      makeCell(spreadRow, spreadChange);
      body.appendChild(spreadRow);

      const totalRow = document.createElement("tr");

      makeCell(totalRow, "Game over/under");
      makeCell(totalRow, fmt(line.overUnderOpen));
      makeCell(totalRow, fmt(line.overUnder));

      let totalChange = "Unavailable";

      if (
        hasNumber(line.overUnderOpen) &&
        hasNumber(line.overUnder)
      ) {
        const delta = Math.round(
          (line.overUnder - line.overUnderOpen) * 100
        ) / 100;

        totalChange = delta === 0
          ? "No change"
          : `${delta > 0 ? "↑" : "↓"} ${
              Math.abs(delta)
            } ${pointLabel(delta)}`;
      }

      makeCell(totalRow, totalChange);
      body.appendChild(totalRow);

      table.appendChild(body);
      wrap.appendChild(table);
      output.appendChild(wrap);
    });
  }

  const originalCompare = window.compareTeams;

  if (typeof originalCompare === "function") {
    window.compareTeams = function (...args) {
      const result = originalCompare.apply(this, args);
      show();
      return result;
    };
  }

  fetch("data/lines-2026.json", {
    cache: "no-store"
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data)) {
        throw new Error("Expected game array");
      }

      games = data;
      loaded = true;
      show();
    })
    .catch(error => {
      console.warn("Odds unavailable:", error);
      loadError = true;
      show();
    });
})();
