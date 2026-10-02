// ============================================================
// DOC'S CFB WAR ROOM
// SCORING PREDICTION ENGINE
// Version 1.0
// ============================================================
//
// PURPOSE
// Creates estimated:
//   • First Quarter Score / Total / Margin
//   • First Half Score / Total / Margin
//   • Full Game Score / Total / Margin
//
// IMPORTANT:
// This first version does NOT use sportsbook lines to create
// the prediction.
//
// It also does NOT apply an arbitrary SOS adjustment.
// SOS can be added later after we validate the base model.
//
// ============================================================

(function () {
  "use strict";

  // ----------------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------------

  const ENGINE_ID = "scoringPredictionEngine";

  /*
    College scoring baseline.

    This is only the starting scoring environment for the model.
    Team efficiency data then moves each team's projection
    above or below that baseline.

    Keeping this in one place makes the engine easy to calibrate
    after we compare projections with actual game results.
  */

  const BASE_TEAM_POINTS = 27.0;

  /*
    Time splits.

    We will eventually replace these with team-specific
    quarter/half scoring profiles when that data is available.

    For now:
      First half = 50% of projected full-game scoring
      First quarter = 25% of projected full-game scoring
  */

  const FIRST_HALF_SHARE = 0.50;
  const FIRST_QUARTER_SHARE = 0.25;

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------

  function validNumber(value) {
    return (
      typeof value === "number" &&
      Number.isFinite(value)
    );
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(
      maximum,
      Math.max(minimum, value)
    );
  }

  function getTeam(teamName) {
    if (
      typeof warRoomTeams === "undefined" ||
      !warRoomTeams
    ) {
      return null;
    }

    return warRoomTeams[teamName] || null;
  }

  // ----------------------------------------------------------
  // DATA QUALITY
  // ----------------------------------------------------------

  function countAvailableMetrics(team) {
    if (!team) return 0;

    const values = [
      team?.offense?.ppa,
      team?.offense?.successRate,
      team?.offense?.explosiveness,
      team?.offense?.pointsPerOpportunity,
      team?.defense?.ppa,
      team?.defense?.successRate,
      team?.defense?.explosiveness
    ];

    return values.filter(validNumber).length;
  }

  // ----------------------------------------------------------
  // OFFENSIVE SCORING FACTOR
  // ----------------------------------------------------------

  function offensiveFactor(team) {
    if (!team) return 1;

    const offense = team.offense || {};

    let factor = 1;
    let pieces = 0;

    /*
      Offensive PPA

      Positive offensive PPA raises scoring expectation.
      Negative PPA lowers it.
    */

    if (validNumber(offense.ppa)) {
      factor += offense.ppa * 0.90;
      pieces++;
    }

    /*
      Success Rate

      Around .42 is treated as a neutral working point
      for this first calibration.

      Higher success rate increases drive sustainability.
    */

    if (validNumber(offense.successRate)) {
      factor +=
        (offense.successRate - 0.42) * 1.20;
      pieces++;
    }

    /*
      Points per Opportunity

      This measures how effectively an offense finishes
      scoring opportunities.

      4.0 is used as the neutral working point.
    */

    if (
      validNumber(
        offense.pointsPerOpportunity
      )
    ) {
      factor +=
        (
          offense.pointsPerOpportunity -
          4.0
        ) * 0.08;

      pieces++;
    }

    /*
      Explosiveness

      Used lightly because explosive-play metrics can
      be volatile, especially with small samples.
    */

    if (
      validNumber(
        offense.explosiveness
      )
    ) {
      factor +=
        (
          offense.explosiveness -
          1.20
        ) * 0.12;

      pieces++;
    }

    /*
      If no offensive metrics exist,
      return neutral rather than guessing.
    */

    if (pieces === 0) {
      return 1;
    }

    return clamp(
      factor,
      0.55,
      1.55
    );
  }

  // ----------------------------------------------------------
  // DEFENSIVE SCORING FACTOR
  // ----------------------------------------------------------

  function defensiveFactor(team) {
    if (!team) return 1;

    const defense = team.defense || {};

    let factor = 1;
    let pieces = 0;

    /*
      Defensive PPA

      Lower is better for the defense.

      A defense allowing positive PPA increases the
      opponent's scoring expectation.

      Negative defensive PPA reduces it.
    */

    if (validNumber(defense.ppa)) {
      factor += defense.ppa * 0.90;
      pieces++;
    }

    /*
      Defensive Success Rate Allowed

      Around .42 is the neutral working point.

      Higher allowed success rate helps the opposing
      offense sustain drives.
    */

    if (
      validNumber(
        defense.successRate
      )
    ) {
      factor +=
        (
          defense.successRate -
          0.42
        ) * 1.10;

      pieces++;
    }

    /*
      Defensive Explosiveness Allowed

      Higher values slightly raise opponent scoring.
      Weight is intentionally smaller.
    */

    if (
      validNumber(
        defense.explosiveness
      )
    ) {
      factor +=
        (
          defense.explosiveness -
          1.20
        ) * 0.10;

      pieces++;
    }

    if (pieces === 0) {
      return 1;
    }

    return clamp(
      factor,
      0.60,
      1.50
    );
  }

  // ----------------------------------------------------------
  // PROJECT ONE TEAM'S FULL-GAME SCORE
  // ----------------------------------------------------------

  function projectTeamScore(
    offenseTeam,
    opponentTeam
  ) {
    const offense =
      offensiveFactor(offenseTeam);

    const opponentDefense =
      defensiveFactor(opponentTeam);

    /*
      Blend offense and opponent defense.

      We average the two factors rather than multiply
      them. This prevents extreme values from exploding
      the score during the first calibration stage.
    */

    const matchupFactor =
      (offense + opponentDefense) / 2;

    const projectedPoints =
      BASE_TEAM_POINTS * matchupFactor;

    /*
      Guardrails prevent obviously broken projections
      if an upstream statistic is unusual.
    */

    return round1(
      clamp(
        projectedPoints,
        7,
        55
      )
    );
  }

  // ----------------------------------------------------------
  // MARGIN TEXT
  // ----------------------------------------------------------

  function marginText(
    awayName,
    homeName,
    awayScore,
    homeScore
  ) {
    const difference =
      round1(
        Math.abs(
          awayScore - homeScore
        )
      );

    if (difference === 0) {
      return "Even";
    }

    if (awayScore > homeScore) {
      return (
        awayName +
        " by " +
        difference.toFixed(1)
      );
    }

    return (
      homeName +
      " by " +
      difference.toFixed(1)
    );
  }

  // ----------------------------------------------------------
  // BUILD PROJECTION
  // ----------------------------------------------------------

  function calculatePrediction(
    awayName,
    homeName
  ) {
    const awayTeam =
      getTeam(awayName);

    const homeTeam =
      getTeam(homeName);

    if (!awayTeam || !homeTeam) {
      return null;
    }

    const awayFull =
      projectTeamScore(
        awayTeam,
        homeTeam
      );

    const homeFull =
      projectTeamScore(
        homeTeam,
        awayTeam
      );

    const fullTotal =
      round1(
        awayFull + homeFull
      );

    const awayHalf =
      round1(
        awayFull *
        FIRST_HALF_SHARE
      );

    const homeHalf =
      round1(
        homeFull *
        FIRST_HALF_SHARE
      );

    const halfTotal =
      round1(
        awayHalf + homeHalf
      );

    const awayQuarter =
      round1(
        awayFull *
        FIRST_QUARTER_SHARE
      );

    const homeQuarter =
      round1(
        homeFull *
        FIRST_QUARTER_SHARE
      );

    const quarterTotal =
      round1(
        awayQuarter +
        homeQuarter
      );

    return {
      awayName,
      homeName,

      firstQuarter: {
        away: awayQuarter,
        home: homeQuarter,
        total: quarterTotal,
        margin: marginText(
          awayName,
          homeName,
          awayQuarter,
          homeQuarter
        )
      },

      firstHalf: {
        away: awayHalf,
        home: homeHalf,
        total: halfTotal,
        margin: marginText(
          awayName,
          homeName,
          awayHalf,
          homeHalf
        )
      },

      fullGame: {
        away: awayFull,
        home: homeFull,
        total: fullTotal,
        margin: marginText(
          awayName,
          homeName,
          awayFull,
          homeFull
        )
      },

      dataQuality: {
        awayMetrics:
          countAvailableMetrics(
            awayTeam
          ),

        homeMetrics:
          countAvailableMetrics(
            homeTeam
          )
      }
    };
  }

  // ----------------------------------------------------------
  // CREATE ENGINE CONTAINER
  // ----------------------------------------------------------

  function getEngineContainer() {
    let container =
      document.getElementById(
        ENGINE_ID
      );

    if (container) {
      return container;
    }

    container =
      document.createElement("div");

    container.id = ENGINE_ID;

    container.style.marginTop =
      "28px";

    /*
      Put the engine after the statistical
      comparison table area whenever possible.
    */

    const statsBody =
      document.getElementById(
        "statsBody"
      );

    if (
      statsBody &&
      statsBody.closest("table")
    ) {
      const table =
        statsBody.closest("table");

      const parent =
        table.parentElement;

      if (parent) {
        parent.insertAdjacentElement(
          "afterend",
          container
        );

        return container;
      }
    }

    /*
      Backup location.
    */

    const results =
      document.getElementById(
        "results"
      );

    if (results) {
      results.insertAdjacentElement(
        "afterend",
        container
      );

      return container;
    }

    document.body.appendChild(
      container
    );

    return container;
  }

  // ----------------------------------------------------------
  // TABLE ROW
  // ----------------------------------------------------------

  function predictionRow(
    label,
    awayValue,
    homeValue
  ) {
    return `
      <tr>
        <td>${label}</td>
        <td>${awayValue}</td>
        <td>${homeValue}</td>
      </tr>
    `;
  }

  // ----------------------------------------------------------
  // DISPLAY ENGINE
  // ----------------------------------------------------------

  function renderPrediction(
    awayName,
    homeName
  ) {
    const prediction =
      calculatePrediction(
        awayName,
        homeName
      );

    const container =
      getEngineContainer();

    if (!prediction) {
      container.innerHTML = "";
      return;
    }

    const q =
      prediction.firstQuarter;

    const h =
      prediction.firstHalf;

    const f =
      prediction.fullGame;

    container.innerHTML = `
      <div style="
        background:#132a42;
        border-radius:10px;
        overflow:hidden;
      ">

        <h2 style="
          margin:0;
          padding:16px;
          color:#50e3a4;
        ">
          Scoring Prediction Engine
        </h2>

        <div style="
          overflow-x:auto;
          padding:0 10px 10px 10px;
        ">

          <table style="
            width:100%;
            border-collapse:collapse;
          ">

            <thead>
              <tr>
                <th>Prediction</th>
                <th>${awayName}</th>
                <th>${homeName}</th>
              </tr>
            </thead>

            <tbody>

              ${predictionRow(
                "First Quarter Estimated Score",
                q.away.toFixed(1),
                q.home.toFixed(1)
              )}

              ${predictionRow(
                "First Quarter Estimated Total",
                q.total.toFixed(1),
                q.total.toFixed(1)
              )}

              ${predictionRow(
                "First Quarter Estimated Margin",
                q.margin,
                "—"
              )}

              ${predictionRow(
                "First Half Estimated Score",
                h.away.toFixed(1),
                h.home.toFixed(1)
              )}

              ${predictionRow(
                "First Half Estimated Total",
                h.total.toFixed(1),
                h.total.toFixed(1)
              )}

              ${predictionRow(
                "First Half Estimated Margin",
                h.margin,
                "—"
              )}

              ${predictionRow(
                "Full Game Estimated Score",
                f.away.toFixed(1),
                f.home.toFixed(1)
              )}

              ${predictionRow(
                "Full Game Estimated Total",
                f.total.toFixed(1),
                f.total.toFixed(1)
              )}

              ${predictionRow(
                "Full Game Estimated Margin",
                f.margin,
                "—"
              )}

            </tbody>

          </table>

        </div>

        <p style="
          margin:0;
          padding:0 12px 14px 12px;
          color:#b7c6d9;
          font-size:12px;
          line-height:1.5;
        ">
          Preliminary scoring estimate based on available
          offensive and defensive efficiency metrics.
          ${awayName}: ${prediction.dataQuality.awayMetrics}
          available model metrics.
          ${homeName}: ${prediction.dataQuality.homeMetrics}
          available model metrics.
          No sportsbook-line or SOS adjustment is applied
          in this version.
        </p>

      </div>
    `;
  }

  // ----------------------------------------------------------
  // CONNECT TO EXISTING ANALYZE BUTTON
  // ----------------------------------------------------------

  function connectEngine() {
    if (
      typeof window.compareTeams !==
      "function"
    ) {
      console.warn(
        "Scoring Engine: compareTeams() was not found."
      );
      return;
    }

    /*
      Preserve the existing War Room function.
    */

    const originalCompareTeams =
      window.compareTeams;

    /*
      Prevent accidental double wrapping.
    */

    if (
      originalCompareTeams
        .__scoringEngineWrapped
    ) {
      return;
    }

    function wrappedCompareTeams() {
      originalCompareTeams();

      const away =
        document.getElementById(
          "away"
        );

      const home =
        document.getElementById(
          "home"
        );

      if (
        !away ||
        !home ||
        !away.value ||
        !home.value ||
        away.value === home.value
      ) {
        return;
      }

      renderPrediction(
        away.value,
        home.value
      );
    }

    wrappedCompareTeams
      .__scoringEngineWrapped = true;

    window.compareTeams =
      wrappedCompareTeams;

    console.log(
      "Doc's CFB Scoring Prediction Engine connected."
    );
  }

  // ----------------------------------------------------------
  // START
  // ----------------------------------------------------------

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      connectEngine
    );
  } else {
    connectEngine();
  }

  /*
    Expose these for testing/calibration.
  */

  window.DocCFBScoringEngine = {
    calculatePrediction,
    renderPrediction
  };

})();
