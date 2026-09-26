
// DOC'S CFB WAR ROOM 4.0
// Automatic College Football Statistics Loader

const AUTO_STATS_URL = "data/advanced-2026.json";

async function loadAutomaticStats() {
  try {
    const response = await fetch(
      AUTO_STATS_URL + "?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Could not download statistics.");
    }

    const records = await response.json();

    if (!Array.isArray(records)) {
      throw new Error("Unexpected statistics format.");
    }

    let updated = 0;

    records.forEach(record => {
      if (!record.team) return;

      const teamName = record.team;

      // Match an existing team, ignoring capitalization.
      const existingName = Object.keys(warRoomTeams)
        .find(name =>
          name.toLowerCase() === teamName.toLowerCase()
        );

      const name = existingName || teamName;

      const original = warRoomTeams[name] || emptyTeam();

      const offense = record.offense || {};
      const defense = record.defense || {};

      // Only accept actual numbers.
      function validNumber(value) {
        return typeof value === "number" &&
          Number.isFinite(value) ? value : null;
      }

      warRoomTeams[name] = {
        ...original,

        offense: {
          ...original.offense,
          ppa: validNumber(offense.ppa),
          successRate: validNumber(offense.successRate),
          explosiveness:
            validNumber(offense.explosiveness),
          pointsPerOpportunity:
            validNumber(offense.pointsPerOpportunity)
        },

        defense: {
          ...original.defense,
          ppa: validNumber(defense.ppa),
          successRate: validNumber(defense.successRate),
          explosiveness:
            validNumber(defense.explosiveness)
        },

        dataInfo: {
          season: 2026,
          source: "CollegeFootballData",
          lastUpdated: new Date()
            .toISOString()
            .slice(0, 10),
          verified: false
        }
      };

      updated++;
    });

    refreshMenus();
    loadTeamEditor();

    console.log(
      "War Room: Loaded " +
      updated +
      " team records."
    );

    const results = document.getElementById("results");

    if (results) {
      results.textContent =
        "Automatic statistics loaded for " +
        updated +
        " teams. Select two teams to compare.";
    }

  } catch (error) {
    console.error(
      "Automatic statistics update failed:",
      error
    );

    const results = document.getElementById("results");

    if (results) {
      results.textContent =
        "Automatic statistics unavailable. " +
        "Your existing team data is still available.";
    }
  }
}

// Wait until the original War Room has initialized.
document.addEventListener("DOMContentLoaded", () => {
  loadAutomaticStats();
});
