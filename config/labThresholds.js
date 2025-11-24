// config/labThresholds.js
// Comprehensive clinical reference ranges & severity thresholds
// Sources: Mayo Clinic, ARUP, Quest Diagnostics, and standard textbooks
// Adjust for your local lab's reference ranges and population as needed

module.exports = {
  // COMPLETE BLOOD COUNT (CBC)
  hemoglobin: {
    unit: "g/dL",
    male: { normalLow: 13.8, normalHigh: 17.2 },
    female: { normalLow: 12.1, normalHigh: 15.1 },
    severityLow: { mild: 0.95, moderate: 0.85, severe: 0.70 }, // fraction of normalLow
    severityHigh: { mild: 1.10, moderate: 1.20, severe: 1.30 } // fraction of normalHigh (rare)
  },

  hematocrit: {
    unit: "%",
    male: { normalLow: 40.7, normalHigh: 50.3 },
    female: { normalLow: 36.1, normalHigh: 44.3 },
    severityLow: { mild: 0.95, moderate: 0.85, severe: 0.75 },
    severityHigh: { mild: 1.10, moderate: 1.20, severe: 1.30 }
  },

  rbc: {
    unit: "×10⁶/µL",
    male: { normalLow: 4.5, normalHigh: 5.9 },
    female: { normalLow: 4.1, normalHigh: 5.1 },
    severityLow: { mild: 0.9, moderate: 0.8, severe: 0.7 }
  },

  wbc: {
    unit: "×10³/µL",
    normalLow: 4.0,
    normalHigh: 11.0,
    severityLow: { mild: 0.85, moderate: 0.65, severe: 0.4 },
    severityHigh: { mild: 1.4, moderate: 2.0, severe: 3.0 }
  },

  platelet: {
    unit: "×10³/µL",
    normalLow: 150,
    normalHigh: 450,
    severityLow: { mild: 0.9, moderate: 0.7, severe: 0.4 },
    severityHigh: { mild: 2.0, moderate: 3.0, severe: 5.0 }
  },

  // COMPREHENSIVE METABOLIC PANEL (CMP)
  glucose_fasting: {
    unit: "mg/dL",
    normalLow: 70,
    normalHigh: 99,
    severityLow: { mild: 0.8, moderate: 0.65, severe: 0.55 },     // hypoglycemia
    severityHigh: { mild: 1.26, moderate: 1.8, severe: 2.5 }     // hyperglycemia (126+ = diabetes)
  },

  glucose_random: {
    unit: "mg/dL",
    normalHigh: 140,
    severityHigh: { mild: 1.43, moderate: 1.8, severe: 2.5 } // >200 with symptoms = diabetes
  },

  sodium: {
    unit: "mmol/L",
    normalLow: 135,
    normalHigh: 145,
    severityLow: { mild: 0.97, moderate: 0.93, severe: 0.89 },   // <130 severe
    severityHigh: { mild: 1.03, moderate: 1.07, severe: 1.10 }
  },

  potassium: {
    unit: "mmol/L",
    normalLow: 3.5,
    normalHigh: 5.0,
    severityLow: { mild: 0.94, moderate: 0.86, severe: 0.77 },   // <3.0 critical
    severityHigh: { mild: 1.1, moderate: 1.2, severe: 1.3 }     // >6.0 critical
  },

  creatinine: {
    unit: "mg/dL",
    male: { normalLow: 0.7, normalHigh: 1.3 },
    female: { normalLow: 0.6, normalHigh: 1.1 },
    severityHigh: { mild: 1.5, moderate: 2.0, severe: 3.5 }      // higher = worse
  },

  egfr: {
    unit: "mL/min/1.73m²",
    normalLow: 90,
    severityLow: { mild: 0.67, moderate: 0.5, severe: 0.33 }     // <60 = CKD stage 3
  },

  bun: {
    unit: "mg/dL",
    normalLow: 7,
    normalHigh: 20,
    severityHigh: { mild: 1.5, moderate: 2.5, severe: 4.0 }
  },

  calcium: {
    unit: "mg/dL",
    normalLow: 8.5,
    normalHigh: 10.2,
    severityLow: { mild: 0.92, moderate: 0.85, severe: 0.75 },
    severityHigh: { mild: 1.1, moderate: 1.2, severe: 1.4 }
  },

  total_bilirubin: {
    unit: "mg/dL",
    normalHigh: 1.2,
    severityHigh: { mild: 1.7, moderate: 5.0, severe: 10.0 }
  },

  ast: {
    unit: "U/L",
    normalHigh: 40,
    severityHigh: { mild: 2.5, moderate: 5.0, severe: 10.0 }
  },

  alt: {
    unit: "U/L",
    normalHigh: 40,
    severityHigh: { mild: 3.0, moderate: 7.0, severe: 15.0 }
  },

  alp: {
    unit: "U/L",
    normalLow: 44,
    normalHigh: 147,
    severityHigh: { mild: 2.0, moderate: 3.0, severe: 5.0 }
  },

  total_protein: {
    unit: "g/dL",
    normalLow: 6.4,
    normalHigh: 8.3
  },

  albumin: {
    unit: "g/dL",
    normalLow: 3.5,
    normalHigh: 5.0,
    severityLow: { mild: 0.9, moderate: 0.75, severe: 0.6 }
  },

  // LIPID PANEL
  cholesterol_total: {
    unit: "mg/dL",
    normalHigh: 200,
    severityHigh: { mild: 1.2, moderate: 1.45, severe: 1.7 } // >240 high
  },

  triglycerides: {
    unit: "mg/dL",
    normalHigh: 150,
    severityHigh: { mild: 1.33, moderate: 3.33, severe: 6.67 } // >500 very high
  },

  hdl: {
    unit: "mg/dL",
    normalLow: 40,        // male; >50 female often preferred
    severityLow: { mild: 0.9, moderate: 0.75, severe: 0.6 }
  },

  ldl: {
    unit: "mg/dL",
    normalHigh: 100,
    severityHigh: { mild: 1.3, moderate: 1.6, severe: 1.9 } // >160 high
  },

  // THYROID
  tsh: {
    unit: "µIU/mL",
    normalLow: 0.4,
    normalHigh: 4.0,
    severityLow: { mild: 0.25, moderate: 0.1, severe: 0.025 },   // <0.1 severe hyper
    severityHigh: { mild: 2.5, moderate: 6.0, severe: 10.0 }    // >10 severe hypo
  },

  free_t4: {
    unit: "ng/dL",
    normalLow: 0.8,
    normalHigh: 1.8
  },

  // IRON STUDIES
  ferritin: {
    unit: "ng/mL",
    male: { normalLow: 30, normalHigh: 400 },
    female: { normalLow: 15, normalHigh: 150 },
    severityLow: { mild: 0.7, moderate: 0.4, severe: 0.2 }
  },

  // VITAMINS
  vitamin_d_25: {
    unit: "ng/mL",
    normalLow: 30,
    severityLow: { mild: 0.67, moderate: 0.4, severe: 0.25 }    // <20 deficient
  },

  vitamin_b12: {
    unit: "pg/mL",
    normalLow: 200,
    severityLow: { mild: 0.75, moderate: 0.5, severe: 0.35 }
  },

  // INFLAMMATION
  crp: {
    unit: "mg/L",
    normalHigh: 3,
    severityHigh: { mild: 3.3, moderate: 10, severe: 30 }
  },

  esr: {
    unit: "mm/hr",
    male: { normalHigh: 15 },
    female: { normalHigh: 20 },
    severityHigh: { mild: 2.0, moderate: 3.5, severe: 5.0 }
  }
};