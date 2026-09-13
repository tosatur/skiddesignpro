import { designConfig } from "../config/designConfig.js";
import {
  formatMeasurement,
  sumSulphurComponents,
} from "../../shared/measurements.js";

const WITHIN = "Within Limit",
  OUTSIDE = "Outside Limit",
  POTENTIAL = "Potentially Outside Limit";
function maximumCheck(value, maximum) {
  if (value.high <= maximum) return WITHIN;
  return value.low > maximum ? OUTSIDE : POTENTIAL;
}
function massLoad(value, volume) {
  return {
    ...value,
    low: (value.low * volume) / 1000,
    high: (value.high * volume) / 1000,
  };
}

export function checkTradeWaste(inputs, profile) {
  const limits = designConfig.tradeWasteLimits;
  const values = Object.fromEntries(
    profile.parameters.map((p) => [p.key, p.value]),
  );
  const results = [];
  const add = (key, parameter, value, criterion, status, reference = "") =>
    results.push({ key, parameter, value, criterion, status, reference });
  for (const [key, label] of [
    ["inletPH", "Inlet pH"],
    ["targetPH", "Target pH"],
  ]) {
    add(
      key,
      label,
      String(inputs[key]),
      `${limits.pH.min}–${limits.pH.max}`,
      inputs[key] >= limits.pH.min && inputs[key] <= limits.pH.max
        ? WITHIN
        : OUTSIDE,
      limits.pH.reference,
    );
  }
  add(
    "temperature",
    "Temperature",
    `${inputs.temperature} °C`,
    `≤ ${limits.temperature.max} °C`,
    inputs.temperature <= limits.temperature.max ? WITHIN : OUTSIDE,
    limits.temperature.reference,
  );
  for (const [key, label] of [
    ["bod", "BOD5"],
    ["tss", "Suspended solids"],
  ]) {
    if (!values[key]) continue;
    const limit = limits[key];
    // The agreement applies the concentration limit only above the daily load.
    // Both conditions must be exceeded, including when a measurement is a range.
    const threshold = Math.max(
      limit.concentration,
      (limit.dailyLoad * 1000) / inputs.dailyVolume,
    );
    add(
      key,
      label,
      `${formatMeasurement(values[key])} mg/L; ${formatMeasurement(massLoad(values[key], inputs.dailyVolume))} kg/day`,
      `≤ ${limit.concentration.toLocaleString("en-AU")} mg/L if load > ${limit.dailyLoad.toLocaleString("en-AU")} kg/day`,
      maximumCheck(values[key], threshold),
      limit.reference,
    );
  }
  if (values.tds) {
    const tdsLoad = massLoad(values.tds, inputs.dailyVolume);
    add(
      "tds",
      "Dissolved solids",
      `${formatMeasurement(tdsLoad)} kg/day`,
      `≤ ${limits.tds.dailyLoad} kg/day`,
      maximumCheck(tdsLoad, limits.tds.dailyLoad),
      limits.tds.reference,
    );
  }
  if (values.tkn)
    add(
      "tkn",
      "Total Kjeldahl nitrogen",
      `${formatMeasurement(values.tkn)} mg/L as N`,
      `≤ ${limits.tkn.max} mg/L as N`,
      maximumCheck(values.tkn, limits.tkn.max),
      limits.tkn.reference,
    );

  // Preserve reporting bounds: < 50 is not an exact concentration of 50.
  // Typical-profile component ranges produce a conservative screening envelope.
  const calculated = sumSulphurComponents(values);
  const exact = calculated && calculated.low === calculated.high;
  const sulphur = exact ? calculated : (values.sulphur ?? calculated);
  const usesCalculated = sulphur === calculated;
  if (sulphur) {
    const limit = limits.sulphur;
    const sulphurStatus =
      sulphur.high < limit.generalExclusive ||
      (sulphur.high === limit.generalExclusive && sulphur.highExclusive)
        ? WITHIN
        : sulphur.low > limit.treatmentThreshold
          ? "Treatment Required"
          : sulphur.low < limit.generalExclusive &&
              sulphur.high <= limit.treatmentThreshold
            ? "Potentially Conditional"
            : "Conditional / Engineering Review Required";
    add(
      "sulphur",
      "Total oxidised sulphur",
      `${formatMeasurement(sulphur)} mg/L as S${usesCalculated ? " (calculated)" : ""}`,
      `< ${limit.generalExclusive} mg/L as S; ${limit.generalExclusive}-${limit.treatmentThreshold} conditional; > ${limit.treatmentThreshold} treatment required`,
      sulphurStatus,
      limit.reference,
    );
    const row = results.at(-1);
    if (sulphurStatus === "Potentially Conditional")
      row.explanation = `${inputs.wastewaterProfile === "typical" ? "Reference profile bound" : "Supplied range or bound"} may extend into the conditional range. Actual concentration required for final assessment.`;
    if (usesCalculated)
      row.basis =
        calculated.low === calculated.high
          ? "Total oxidised sulphur calculated as sulphate + sulphite + thiosulphate."
          : "Total oxidised sulphur uses the sum of component bounds; this screening range is not a measured total.";
    const entered = values.sulphur;
    // Warn only for incompatible values/bounds. Overlapping reporting bounds do
    // not establish a conflict between a laboratory total and its components.
    if (
      calculated &&
      entered &&
      (entered.high < calculated.low ||
        calculated.high < entered.low ||
        (entered.high === calculated.low && entered.highExclusive) ||
        (calculated.high === entered.low && calculated.highExclusive))
    )
      row.warning = `Data warning: Entered Total Oxidised Sulphur (${formatMeasurement(entered)} mg/L as S) does not match the calculated component ${exact ? "total" : "range"} (${formatMeasurement(calculated)} mg/L as S). ${usesCalculated ? "The calculated value" : "The direct total"} is used for screening.`;
    if (sulphurStatus === "Conditional / Engineering Review Required")
      row.explanation = `Sulphur: the supplied value or range reaches the conditional band. Review contributing streams; streams above ${limit.treatmentThreshold} mg/L as S require treatment. Treatment must use technology accepted by the GWW Representative.`;
    if (sulphurStatus === "Treatment Required")
      row.explanation =
        "Sulphur: treatment using technology accepted by the GWW Representative is required before discharge.";
  }
  const rangeExplanation =
    "Supplied wastewater range includes conditions that exceed the acceptance criterion. Actual wastewater sample required for final assessment.";
  for (const row of results)
    if (row.status === POTENTIAL) row.explanation = rangeExplanation;
  return results;
}
