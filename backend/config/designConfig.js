// Reference ranges are transcribed from the supplied files; all equipment
// bands, prices and the container allowance below are editable prototype settings.
export const designConfig = {
  version: 6,
  wastewater: [
    { key: "bod", label: "BOD5", unit: "mg/L", min: 810, max: 18000, row: 5 },
    {
      key: "tss",
      label: "Total suspended solids",
      unit: "mg/L",
      min: 170,
      max: 2000,
      row: 17,
    },
    {
      key: "tds",
      label: "Total dissolved solids",
      unit: "mg/L",
      min: 4300,
      max: 16000,
      row: 13,
    },
    {
      key: "tkn",
      label: "Total Kjeldahl nitrogen",
      unit: "mg/L as N",
      min: 30,
      max: 490,
      row: 14,
    },
    {
      key: "sulphate",
      label: "Sulphate",
      unit: "mg/L as S",
      min: 0,
      max: 150,
      upperExclusive: true,
      row: 10,
    },
    {
      key: "sulphite",
      label: "Sulphite",
      unit: "mg/L as S",
      min: 0,
      max: 50,
      upperExclusive: true,
      row: 11,
    },
    {
      key: "thiosulphate",
      label: "Thiosulphate",
      unit: "mg/L as S",
      min: 0,
      max: 100,
      upperExclusive: true,
      row: 12,
    },
    {
      key: "sulphur",
      label: "Total oxidised sulphur",
      unit: "mg/L as S",
      min: 0,
      max: 150,
      upperExclusive: true,
      row: 16,
    },
  ],
  // Trade Waste Agreement, Schedule 2 (printed page numbers).
  tradeWasteLimits: {
    pH: { min: 6, max: 10, reference: "§2.1, p. 13" },
    temperature: { max: 38, reference: "§1.1, p. 11" },
    bod: { concentration: 4000, dailyLoad: 1000, reference: "§2.2, p. 13" },
    tss: { concentration: 10000, dailyLoad: 1000, reference: "§1.2(b), p. 11" },
    tds: { dailyLoad: 200, reference: "§1.2(c), p. 11" },
    tkn: { max: 500, reference: "§2.3(a), p. 13" },
    sulphur: {
      generalExclusive: 100,
      treatmentThreshold: 600,
      reference: "§2.4(a), p. 13",
    },
  },
  tanks: {
    standardSizesKL: [2, 5, 10, 15, 20],
    // Demonstration selection bands, not residence-time calculations or P&ID rules.
    flowBands: [
      { maxFlowKLH: 10, count: 1, sizeKL: 2 },
      { maxFlowKLH: 25, count: 1, sizeKL: 5 },
      { maxFlowKLH: 50, count: 1, sizeKL: 10 },
      { maxFlowKLH: 100, count: 2, sizeKL: 10 },
    ],
  },
  pumps: {
    ratingsKLH: [5, 10, 20, 30, 50, 75, 100],
    // Preserve the prototype's next-nominal-size rule. No additional margin
    // is assumed; any reviewed allowance can be configured here for both pumps.
    designMargin: 0,
  },
  equipment: {
    feedPumps: 1,
    dischargePumps: 1,
    agitatorsPerTank: 1,
    pHProbesPerTank: 1,
    levelProbesPerTank: 1,
    lowLevelSwitchesPerTank: 1,
    highLevelSwitchesPerTank: 1,
    controlPanels: 1,
    dosingPumps: 1,
  },
  chemicals: [
    { id: "naoh", name: "Sodium Hydroxide (NaOH)", type: "caustic" },
    { id: "hcl", name: "Hydrochloric Acid (HCl)", type: "acid" },
    { id: "h2so4", name: "Sulphuric Acid (H₂SO₄)", type: "acid" },
  ],
  space: { length: 5.8, width: 2.3 },
  layout: {
    // Metres. Planning footprints, not vendor dimensions or approved clearances.
    // Tank footprints include attached agitators/instruments. Only L × W is used.
    tankFootprints: {
      2: { length: 1.3, width: 1.3 },
      5: { length: 1.8, width: 1.8 },
      10: { length: 2.2, width: 2.2 },
      15: { length: 2.5, width: 2.5 },
      20: { length: 2.8, width: 2.8 },
    },
    pumpFootprints: {
      5: { length: 0.55, width: 0.35 },
      10: { length: 0.6, width: 0.4 },
      20: { length: 0.65, width: 0.4 },
      30: { length: 0.75, width: 0.45 },
      50: { length: 0.85, width: 0.5 },
      75: { length: 0.95, width: 0.55 },
      100: { length: 1.05, width: 0.6 },
    },
    dosingPumpFootprint: { length: 0.4, width: 0.3 },
    controlPanelFootprint: { length: 0.8, width: 0.45 },
    spacing: { betweenItems: 0.25, betweenRows: 0.25 },
    frameMargins: { length: 0.15, width: 0.15 },
    dimensionIncrement: 0.05,
  },
  costs: {
    currency: "AUD",
    uncertainty: 0.2,
    rounding: 100,
    // Illustrative allowances, not supplier quotations. Keys are capacity ratings.
    tanks: { 2: 3500, 5: 6000, 10: 9500, 15: 12500, 20: 15500 },
    pumps: {
      5: 900,
      10: 1200,
      20: 1600,
      30: 2000,
      50: 2800,
      75: 3500,
      100: 4500,
    },
    agitator: 1200,
    phProbe: 900,
    // Preliminary package allowance per tank, including LT and low/high switches.
    // Retains the existing level-instrument budget, pending vendor pricing.
    levelInstrumentation: 700,
    dosingPump: 950,
    controlPanel: 3000,
    fabrication: 3500,
    // Existing assembly allowance now explicitly covers piping, valves and assembly.
    pipingValvesAssembly: 2000,
  },
  defaults: { targetPH: 7, acidId: "hcl", wastewaterProfile: "typical" },
  // Form bounds only; these are not engineering design limits.
  inputLimits: {
    nameLength: 120,
    flowRate: 10000,
    dailyVolume: 240000,
    pH: 14,
    temperature: 100,
    concentration: 1e7,
    dimension: 100,
  },
  reportNote:
    "Preliminary screening only. Final discharge compliance must be confirmed against site-specific acceptance requirements. Final tank sizing, pump head and pipeline sizing to be confirmed during detailed engineering. Confirm equipment dimensions and access before fabrication. Costs exclude GST, delivery, site works and chemicals.",
};
