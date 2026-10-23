
// DOC'S CFB WAR ROOM
// Team Statistics Database

const teams = {
  "North Carolina Central": { offense: { ppa: null, successRate: null, explosiveness: null, pointsPerOpportunity: null }, defense: { ppa: null, successRate: null, explosiveness: null } },
  "Delaware State": { offense: { ppa: null, successRate: null, explosiveness: null, pointsPerOpportunity: null }, defense: { ppa: null, successRate: null, explosiveness: null } },
  "Sam Houston": {
    offense: {
      ppa: null,
      successRate: null,
      explosiveness: null,
      pointsPerOpportunity: null
    },
    defense: {
      ppa: null,
      successRate: null,
      explosiveness: null
    }
  },

  "Texas Tech": {
    offense: {
      ppa: null,
      successRate: null,
      explosiveness: null,
      pointsPerOpportunity: null
    },
    defense: {
      ppa: null,
      successRate: null,
      explosiveness: null
    }
  }
};

// DATA VERIFICATION
// Keep historical data separate from current data.

const dataInfo = {
  season: 2026,
  source: "CollegeFootballData",
  lastUpdated: null,
  verified: false
};
