import { test } from "node:test";
import assert from "node:assert/strict";
import {
  exactSulphurTotal,
  formatMeasurement,
  parseMeasurement,
  sumSulphurComponents,
} from "../shared/measurements.js";

test("exact values parse to a single point", () => {
  assert.deepEqual(parseMeasurement("120"), {
    low: 120,
    high: 120,
    highExclusive: false,
  });
  assert.deepEqual(parseMeasurement(" 2.5 "), {
    low: 2.5,
    high: 2.5,
    highExclusive: false,
  });
  assert.deepEqual(parseMeasurement(".5").high, 0.5);
  assert.deepEqual(parseMeasurement(0).high, 0);
});

test("reporting bounds parse to an exclusive range from zero", () => {
  assert.deepEqual(parseMeasurement("< 50"), {
    low: 0,
    high: 50,
    highExclusive: true,
  });
  assert.deepEqual(parseMeasurement("<0.5").high, 0.5);
});

test("blank, negative, zero-bounded and malformed values are rejected", () => {
  for (const raw of [
    "",
    null,
    undefined,
    "-1",
    "< 0",
    "abc",
    "1e3",
    "5 mg/L",
    "> 5",
    "1.2.3",
  ])
    assert.equal(parseMeasurement(raw), null, String(raw));
});

test("measurements format for reports", () => {
  assert.equal(formatMeasurement(null), "Not supplied");
  assert.equal(formatMeasurement(parseMeasurement("1500")), "1,500");
  assert.equal(formatMeasurement(parseMeasurement("< 100")), "< 100");
  assert.equal(
    formatMeasurement({ low: 810, high: 18000, highExclusive: false }),
    "810–18,000",
  );
  assert.equal(
    formatMeasurement({ low: 10, high: 20, highExclusive: true }),
    "10–< 20",
  );
});

test("sulphur components sum only when all three are supplied", () => {
  const values = {
    sulphate: parseMeasurement("10"),
    sulphite: parseMeasurement("< 5"),
    thiosulphate: parseMeasurement("0.1"),
  };
  assert.deepEqual(sumSulphurComponents(values), {
    low: 10.1,
    high: 15.1,
    highExclusive: true,
  });
  assert.equal(sumSulphurComponents({ ...values, thiosulphate: null }), null);
});

test("an exact sulphur total needs three exact components", () => {
  assert.equal(
    exactSulphurTotal({ sulphate: "0.1", sulphite: "0.2", thiosulphate: "3" }),
    3.3,
  );
  assert.equal(
    exactSulphurTotal({ sulphate: "1", sulphite: "< 2", thiosulphate: "3" }),
    null,
  );
  assert.equal(exactSulphurTotal({ sulphate: "1", sulphite: "2" }), null);
});
