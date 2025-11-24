// config/labThresholds.js
// Editable clinical thresholds — adapt for your population and units.
module.exports = {
  hemoglobin: {
    unit: 'g/dL',
    // default ranges: these are general adult reference ranges — adapt for your population
    male: { normalLow: 13.5, normalHigh: 17.5 },
    female: { normalLow: 12.0, normalHigh: 15.5 },
    // severity thresholds expressed as fraction of normalLow for lower-is-bad analytes
    severity: {
      mild: 0.95,
      moderate: 0.85,
      severe: 0.7
    }
  },

  platelet: {
    unit: '10^9/L',
    normalLow: 150,
    normalHigh: 450,
    severity: { mild: 0.9, moderate: 0.7, severe: 0.5 }
  },

  glucose_fasting: {
    unit: 'mg/dL',
    normalLow: 70,
    normalHigh: 99,
    // for glucose higher-is-bad; severity here is ratio relative to normalHigh
    severity: { mild: 1.1, moderate: 1.25, severe: 1.5 }
  }
};
