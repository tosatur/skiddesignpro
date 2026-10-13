import { test } from "node:test";
import assert from "node:assert/strict";
import { validateInputs } from "../backend/services/validation.js";

const inputs = (overrides = {}) => ({
  designName: " Test ",
  clientName: "Client",
  flowRate: 20,
  dailyVolume: 200,
  inletPH: 11,
  targetPH: 7,
  temperature: 25,
  wastewaterProfile: "typical",
  spaceConstraint: { type: "container" },
  ...overrides,
});

const fieldsOf = (raw) => {
  try {
    validateInputs(raw);
  } catch (error) {
    assert.equal(error.status, 400);
    return error.fields;
  }
  assert.fail("expected validation to fail");
};

test("valid inputs are trimmed and defaulted", () => {
  const result = validateInputs(inputs());
  assert.equal(result.designName, "Test");
  assert.equal(result.acidId, "hcl");
  assert.deepEqual(result.priceOverrides, {});
  assert.equal(result.customWastewaterData.bod, "");
});

test("missing and out-of-range fields are reported by name", () => {
  const fields = fieldsOf(
    inputs({
      designName: "  ",
      flowRate: 0,
      dailyVolume: 300000,
      inletPH: 15,
      targetPH: 5,
      temperature: -1,
    }),
  );
  assert.deepEqual(Object.keys(fields).sort(), [
    "dailyVolume",
    "designName",
    "flowRate",
    "inletPH",
    "targetPH",
    "temperature",
  ]);
  assert.equal(fields.targetPH, "Target pH must be between 6.0 and 10.0.");
});

test("non-numeric values are rejected", () => {
  const fields = fieldsOf(inputs({ flowRate: "20", inletPH: Number.NaN }));
  assert.equal(fields.flowRate, "Design flow rate must be numeric.");
  assert.ok(fields.inletPH);
});

test("a null body reports every required field", () => {
  assert.ok(Object.keys(fieldsOf(null)).length > 0);
});

test("custom space needs positive dimensions within the form limit", () => {
  const ok = validateInputs(
    inputs({ spaceConstraint: { type: "custom", length: 4, width: 2 } }),
  );
  assert.deepEqual(ok.spaceConstraint, { type: "custom", length: 4, width: 2 });
  const fields = fieldsOf(
    inputs({ spaceConstraint: { type: "custom", length: 0, width: 101 } }),
  );
  assert.ok(fields["spaceConstraint.length"]);
  assert.ok(fields["spaceConstraint.width"]);
  assert.ok(fieldsOf(inputs({ spaceConstraint: { type: "garage" } })));
});

test("only configured acids are accepted", () => {
  assert.equal(validateInputs(inputs({ acidId: "h2so4" })).acidId, "h2so4");
  assert.ok(fieldsOf(inputs({ acidId: "naoh" })).acidId);
});

test("typical profiles ignore hidden custom data", () => {
  const result = validateInputs(
    inputs({ customWastewaterData: { bod: "not a number" } }),
  );
  assert.equal(result.customWastewaterData.bod, "");
});

test("custom concentrations accept numbers and bounds only", () => {
  const custom = (data) =>
    inputs({ wastewaterProfile: "custom", customWastewaterData: data });
  const result = validateInputs(custom({ bod: 1500, tss: "< 100" }));
  assert.equal(result.customWastewaterData.bod, "1500");
  assert.equal(result.customWastewaterData.tss, "< 100");
  assert.ok(fieldsOf(custom({ bod: "-5" }))["customWastewaterData.bod"]);
  assert.ok(fieldsOf(custom({ tds: "2e7" }))["customWastewaterData.tds"]);
  assert.ok(fieldsOf(custom({ tkn: "20000000" }))["customWastewaterData.tkn"]);
});

test("BOD5 is accepted as an alias for BOD", () => {
  const result = validateInputs(
    inputs({
      wastewaterProfile: "custom",
      customWastewaterData: { bod5: "900" },
    }),
  );
  assert.equal(result.customWastewaterData.bod, "900");
  const both = validateInputs(
    inputs({
      wastewaterProfile: "custom",
      customWastewaterData: { bod: "700", bod5: "900" },
    }),
  );
  assert.equal(both.customWastewaterData.bod, "700");
});

test("design quotes are validated and capped", () => {
  const ok = validateInputs(
    inputs({ priceOverrides: { tank: { unitCost: 4000 } } }),
  );
  assert.deepEqual(ok.priceOverrides.tank, { unitCost: 4000, quoteRef: "" });
  assert.ok(
    fieldsOf(inputs({ priceOverrides: { tank: { unitCost: 2e8 } } }))[
      "priceOverrides.tank.unitCost"
    ],
  );
  const many = Object.fromEntries(
    Array.from({ length: 51 }, (_, i) => [`item${i}`, { unitCost: 1 }]),
  );
  assert.equal(
    fieldsOf(inputs({ priceOverrides: many })).priceOverrides,
    "Too many quotes.",
  );
});
