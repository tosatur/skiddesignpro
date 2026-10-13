import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTradeWaste } from "../backend/services/complianceCheck.js";
import { WastewaterProfile } from "../backend/models/WastewaterProfile.js";
import { validateInputs } from "../backend/services/validation.js";

const check = (overrides = {}) => {
  const inputs = validateInputs({
    designName: "Test",
    clientName: "Client",
    flowRate: 20,
    dailyVolume: 200,
    inletPH: 8,
    targetPH: 7,
    temperature: 25,
    wastewaterProfile: "custom",
    spaceConstraint: { type: "container" },
    ...overrides,
  });
  return checkTradeWaste(inputs, new WastewaterProfile(inputs));
};
const custom = (customWastewaterData, overrides = {}) =>
  check({ customWastewaterData, ...overrides });
const row = (rows, key) => rows.find((r) => r.key === key);

test("pH and temperature are always screened", () => {
  const rows = check({ inletPH: 11 });
  assert.deepEqual(
    rows.map((r) => r.key),
    ["inletPH", "targetPH", "temperature"],
  );
  assert.equal(row(rows, "inletPH").status, "Outside Limit");
  assert.equal(row(rows, "targetPH").status, "Within Limit");
  assert.equal(row(rows, "temperature").status, "Within Limit");
  assert.equal(row(rows, "temperature").explanation, undefined);
});

test("hot wastewater is outside the limit and explains the cooling duty", () => {
  const temperature = row(check({ temperature: 45 }), "temperature");
  assert.equal(temperature.status, "Outside Limit");
  assert.match(temperature.explanation, /cooling of about 162\.6 kW/);
});

test("BOD only counts above the daily load threshold", () => {
  assert.equal(row(custom({ bod: "4800" }), "bod").status, "Within Limit");
  assert.equal(row(custom({ bod: "6000" }), "bod").status, "Outside Limit");
  assert.equal(
    row(custom({ bod: "4800" }, { dailyVolume: 400 }), "bod").status,
    "Outside Limit",
  );
});

test("a range straddling a limit is potentially outside", () => {
  const bod = row(
    check({ wastewaterProfile: "typical", dailyVolume: 800 }),
    "bod",
  );
  assert.equal(bod.status, "Potentially Outside Limit");
  assert.match(bod.explanation, /Actual wastewater sample required/);
  assert.equal(
    row(custom({ tss: "< 20000" }), "tss").status,
    "Potentially Outside Limit",
  );
});

test("dissolved solids are screened as a daily load", () => {
  const within = row(custom({ tds: "500" }), "tds");
  assert.equal(within.status, "Within Limit");
  assert.equal(within.value, "100 kg/day");
  assert.equal(row(custom({ tds: "2000" }), "tds").status, "Outside Limit");
});

test("TKN is screened against its concentration limit", () => {
  assert.equal(row(custom({ tkn: "490" }), "tkn").status, "Within Limit");
  assert.equal(row(custom({ tkn: "600" }), "tkn").status, "Outside Limit");
});

test("unsupplied parameters are left out", () => {
  const keys = custom({ bod: "100" }).map((r) => r.key);
  assert.ok(keys.includes("bod"));
  for (const key of ["tss", "tds", "tkn", "sulphur"])
    assert.ok(!keys.includes(key), key);
});

test("sulphur bands follow the agreement thresholds", () => {
  const status = (sulphur) => row(custom({ sulphur }), "sulphur").status;
  assert.equal(status("50"), "Within Limit");
  assert.equal(status("< 100"), "Within Limit");
  assert.equal(status("300"), "Conditional / Engineering Review Required");
  assert.equal(status("< 500"), "Potentially Conditional");
  assert.equal(status("700"), "Treatment Required");
  assert.match(
    row(custom({ sulphur: "700" }), "sulphur").explanation,
    /treatment .* is required/,
  );
});

test("exact sulphur components are summed and override a mismatched total", () => {
  const sulphur = row(
    custom({
      sulphate: "10",
      sulphite: "20",
      thiosulphate: "30",
      sulphur: "200",
    }),
    "sulphur",
  );
  assert.equal(sulphur.status, "Within Limit");
  assert.match(sulphur.value, /^60 mg\/L as S \(calculated\)$/);
  assert.match(sulphur.basis, /calculated as sulphate/);
  assert.match(
    sulphur.warning,
    /does not match the calculated component total/,
  );
});

test("a direct sulphur total beats component bounds", () => {
  const sulphur = row(
    custom({
      sulphate: "< 10",
      sulphite: "20",
      thiosulphate: "30",
      sulphur: "55",
    }),
    "sulphur",
  );
  assert.equal(sulphur.value, "55 mg/L as S");
  assert.equal(sulphur.warning, undefined);
  assert.equal(sulphur.basis, undefined);
});

test("the typical profile screens sulphur as potentially conditional", () => {
  const sulphur = row(check({ wastewaterProfile: "typical" }), "sulphur");
  assert.equal(sulphur.status, "Potentially Conditional");
  assert.match(sulphur.explanation, /^Reference profile bound/);
});
