
// DOC'S CFB WAR ROOM 4.1
// Automatic Statistics + Strength of Schedule

const AUTO_STATS_URL = "data/advanced-2026.json";
const SOS_STATS_URL = "data/fpi-2026.json";

// Accept verified numeric values only.
function validStatNumber(value) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

// Match team names without capitalization differences.
function findTeamName(teamName) {
  return Object.keys(warRoomTeams).find(
    name =>
      name.trim().toLowerCase() ===
      teamName.trim().toLowerCase()
  );
}

// STEP 1: Load advanced statistics and team names.
async function loadAutomaticStats() {
  try {
    const response = await fetch(
      AUTO_STATS_URL + "?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        "Could not download advanced statistics."
      );
    }

    const records = await response.json();

    if (!Array.isArray(records)) {
      throw new Error(
        "Unexpected advanced statistics format."
      );
    }

    let updated = 0;

    records.forEach(record => {
      if (
        typeof record.team !== "string" ||
        !record.team.trim()
      ) {
        return;
      }

      const teamName = record.team.trim();
      const name =
        findTeamName(teamName) || teamName;

      const original =
        warRoomTeams[name] || emptyTeam();

      const offense = record.offense || {};
      const defense = record.defense || {};

      warRoomTeams[name] = {
        ...original,

        offense: {
          ...original.offense,

          ppa:
            validStatNumber(offense.ppa),

          successRate:
            validStatNumber(offense.successRate),

          explosiveness:
            validStatNumber(offense.explosiveness),

          pointsPerOpportunity:
            validStatNumber(
              offense.pointsPerOpportunity
            )
        },

        defense: {
          ...original.defense,

          ppa:
            validStatNumber(defense.ppa),

          successRate:
            validStatNumber(defense.successRate),

          explosiveness:
            validStatNumber(defense.explosiveness)
        },

        dataInfo: {
          ...(original.dataInfo || {}),

          season: 2026,

          source: "CollegeFootballData",

          lastUpdated:
            new Date().toISOString().slice(0, 10),

          verified: false
        }
      };

      updated++;
    });

    refreshMenus();
    loadTeamEditor();

    const results =
      document.getElementById("results");

    if (results) {
      results.textContent =
        "Automatic statistics loaded for " +
        updated +
        " teams. Loading SOS...";
    }

    console.log(
      "War Room: Loaded " +
      updated +
      " team records."
    );

    return updated;

  } catch (error) {

    console.error(
      "Advanced statistics update failed:",
      error
    );

    const results =
      document.getElementById("results");

    if (results) {
      results.textContent =
        "Automatic statistics unavailable. " +
        "Your existing team data is still available.";
    }

    return null;
  }
}

// STEP 2: Add Strength of Schedule rankings.
async function loadSOS() {
  try {
    const response = await fetch(
      SOS_STATS_URL + "?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        "Could not download SOS statistics."
      );
    }

    const records = await response.json();

    if (!Array.isArray(records)) {
      throw new Error(
        "Unexpected SOS statistics format."
      );
    }

    let matched = 0;

    records.forEach(record => {
      if (
        typeof record.team !== "string" ||
        !record.team.trim()
      ) {
        return;
      }

      const name = findTeamName(record.team);

      // SOS must attach to an existing team.
      if (!name) {
        return;
      }

      
const rank =
  validStatNumber(
    record.resumeRanks?.strengthOfSchedule
  );

const remainingRank =
  validStatNumber(
    record.resumeRanks?.remainingStrengthOfSchedule
  );


      // Do not create a ranking when data is missing.
      if (rank === null) {
        return;
      }

      warRoomTeams[name].sos = {
        rank: rank,

        remainingRank: remainingRank,

        season: 2026,

        source: "CollegeFootballData FPI"
      };

      matched++;
    });

    console.log(
      "War Room: SOS loaded for " +
      matched +
      " teams."
    );

    return matched;

  } catch (error) {

    console.error(
      "SOS update failed:",
      error
    );

    return null;
  }
}

// STEP 3: Run both loaders in the correct order.
document.addEventListener(
  "DOMContentLoaded",
  async () => {

    const teamCount =
      await loadAutomaticStats();

    // Protect the original statistics.
    // SOS failure must not interrupt team loading.
    if (teamCount === null) {
      return;
    }

    const sosCount = await loadSOS();

    const results =
      document.getElementById("results");

    if (results) {

      if (sosCount === null) {

        results.textContent =
          "Advanced statistics loaded for " +
          teamCount +
          " teams. SOS is currently unavailable.";

      } else {

        results.textContent =
          "Advanced statistics loaded for " +
          teamCount +
          " teams. SOS loaded for " +
          sosCount +
          " teams. Select two teams to compare.";
      }
    }

    refreshMenus();
    loadTeamEditor();
  }
);
