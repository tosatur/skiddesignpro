import { test } from "node:test";
import assert from "node:assert/strict";
import { Design } from "../backend/models/Design.js";
import {
  equipmentDetails,
  generateIOList,
  selectChemical,
} from "../backend/services/equipmentSelection.js";
import { equipmentSelectionForDesign } from "../backend/services/equipmentSettings.js";
import { normalizeEquipmentEnabled } from "../backend/config/equipmentOptions.js";
import { assignTags } from "../backend/services/tagging.js";

const inputs = (overrides = {}) => ({
  designName: "Test",
  clientName: "Client",
  flowRate: 20,
  dailyVolume: 200,
  inletPH: 11,
  targetPH: 7,
  temperature: 25,
  wastewaterProfile: "typical",
  spaceConstraint: { type: "container" },
  acidId: "hcl",
  ...overrides,
});
const generate = (overrides = {}, equipmentEnabled) =>
  new Design(inputs(overrides), null, { equipmentEnabled }).generated;
const item = (generated, id) =>
  generated.equipment.items.find((i) => i.id === id);

test("equipment defaults to enabled unless explicitly disabled", () => {
  const enabled = normalizeEquipmentEnabled({ tank: false, agitator: 0 });
  assert.equal(enabled.tank, false);
  assert.equal(enabled.agitator, true);
  assert.equal(enabled.feedPump, true);
  assert.equal(Object.values(normalizeEquipmentEnabled()).every(Boolean), true);
  assert.equal(normalizeEquipmentEnabled(null).tank, true);
});

test("dosing direction follows the pH correction", () => {
  const select = (overrides) => selectChemical(inputs(overrides));
  assert.equal(select({ inletPH: 4 }).correction, "Raise pH");
  assert.equal(select({ inletPH: 4 }).chemical.id, "naoh");
  assert.equal(select({ inletPH: 11 }).correction, "Lower pH");
  assert.equal(select({ inletPH: 11 }).chemical.id, "hcl");
  assert.equal(select({ acidId: "h2so4" }).chemical.id, "h2so4");
  assert.equal(select({ inletPH: 7 }).correction, "Maintain pH");
  assert.equal(select({ inletPH: 7 }).chemical, null);
  assert.equal(select({}).control, "Continuous pH feedback (PID)");
  assert.equal(select({}).feedbackEnabled, true);
});

test("disabled dosing equipment changes the control description", () => {
  const select = (equipmentEnabled, overrides = {}) =>
    selectChemical(inputs(overrides), equipmentEnabled);
  assert.equal(
    select({ causticDosingPump: false, acidDosingPump: false }).control,
    "Dosing disabled",
  );
  assert.equal(
    select({ dosingController: false }).control,
    "External dosing control required",
  );
  const noProbe = select({ phProbe: false });
  assert.match(noProbe.control, /pH measurement not selected/);
  assert.equal(noProbe.feedbackEnabled, false);
  assert.match(
    select({ causticDosingPump: false }, { inletPH: 4 }).note,
    /Caustic dosing is disabled/,
  );
  assert.match(
    select({ acidDosingPump: false }).note,
    /Acid dosing is disabled/,
  );
});

test("tank count and size follow the flow bands", () => {
  const small = generate({ flowRate: 10 });
  assert.deepEqual(small.equipment.tank, { count: 1, sizeKL: 2 });
  assert.equal(item(small, "overflow"), undefined);
  const large = generate({ flowRate: 80, dailyVolume: 800 });
  assert.deepEqual(large.equipment.tank, { count: 2, sizeKL: 10 });
  assert.equal(item(large, "overflow").quantity, 1);
  assert.equal(item(large, "agitator").quantity, 2);
  const outside = generate({ flowRate: 500, dailyVolume: 5000 });
  assert.equal(outside.equipment.tank.count, null);
  assert.match(outside.equipment.sizing.tank, /outside the configured/);
});

test("pumps take the next nominal rating", () => {
  assert.equal(generate({ flowRate: 8 }).equipment.pump.flowKLH, 10);
  assert.equal(generate({ flowRate: 30 }).equipment.pump.flowKLH, 30);
  const outside = generate({ flowRate: 120, dailyVolume: 1200 });
  assert.equal(outside.equipment.pump.flowKLH, null);
  assert.match(outside.equipment.sizing.pump, /No configured nominal capacity/);
  assert.deepEqual(outside.process.pipes, []);
});

test("disabling tanks removes everything mounted on them", () => {
  const generated = generate({}, { tank: false });
  assert.equal(generated.equipment.tank.count, 0);
  for (const id of [
    "tank",
    "agitator",
    "phProbe",
    "levelProbe",
    "lowLevelSwitch",
    "highLevelSwitch",
    "overflow",
    "recirculation",
  ])
    assert.equal(item(generated, id), undefined, id);
  const costIds = generated.cost.lines.map((line) => line.id);
  assert.ok(!costIds.includes("levelInstrumentation"));
  assert.ok(costIds.includes("fabrication"));
});

test("chemical line valves scale with the enabled dosing trains", () => {
  assert.equal(item(generate(), "manualValve").quantity, 4);
  assert.equal(item(generate(), "nonReturnValve").quantity, 2);
  const one = generate({}, { acidDosingPump: false });
  assert.equal(item(one, "manualValve").quantity, 2);
  assert.deepEqual(item(one, "pressureReliefValve").tags, ["100PRV01"]);
  const none = generate(
    {},
    { acidDosingPump: false, causticDosingPump: false },
  );
  assert.equal(item(none, "manualValve"), undefined);
  assert.equal(item(none, "nonReturnValve"), undefined);
});

test("a disabled cooler is left out even when the inlet is hot", () => {
  const generated = generate({ temperature: 45 }, { coolingHx: false });
  assert.equal(item(generated, "coolingHx"), undefined);
  assert.equal(generated.process.cooling, null);
  assert.ok(generate({ temperature: 45 }).process.cooling.dutyKW > 0);
});

test("disabling the only pumps excludes pump sizing", () => {
  const generated = generate({}, { feedPump: false, dischargePump: false });
  assert.equal(generated.equipment.pump.flowKLH, null);
  assert.match(generated.equipment.sizing.pump, /pumps are disabled/);
  const feedOnly = generate({}, { dischargePump: false });
  assert.match(feedOnly.equipment.sizing.pump, /^Feed pump basis/);
  assert.equal(feedOnly.process.pipes[0].line, "Process lines (feed)");
});

test("tank-mounted tags number per tank", () => {
  const items = assignTags(
    [
      { id: "tank", quantity: 2 },
      { id: "phProbe", quantity: 2 },
      { id: "levelProbe", quantity: 4 },
      { id: "overflow", quantity: 1 },
    ],
    2,
  );
  assert.deepEqual(items[0].tags, ["100T01", "100T02"]);
  assert.deepEqual(items[1].tags, ["100T01PH01", "100T02PH01"]);
  assert.deepEqual(items[2].tags, [
    "100T01LT01",
    "100T01LT02",
    "100T02LT01",
    "100T02LT02",
  ]);
  assert.equal(items[3].tags, undefined);
});

test("unsized quantities get no tags", () => {
  const [tank] = assignTags([{ id: "tank", quantity: null }], null);
  assert.deepEqual(tank.tags, []);
});

test("signals without a controller are marked unassigned", () => {
  const equipment = {
    items: [
      { id: "feedPump", name: "Feed pump", quantity: 1, tags: ["100PU01"] },
    ],
  };
  const io = generateIOList(equipment);
  assert.equal(io.length, 2);
  assert.ok(io.every((row) => row.controller === "Not assigned"));
  assert.deepEqual(
    io.map((row) => row.direction),
    ["Output", "Input"],
  );
});

test("older saved item ids still get descriptions", () => {
  const equipment = { tank: { count: 2 } };
  const dosing = { chemical: { type: "acid" } };
  const describe = (item) => equipmentDetails(item, equipment, dosing);
  assert.equal(describe({ id: "dosingPump" }), "Acid dosing");
  assert.equal(describe({ id: "controlPanel" }), "Skid control");
  assert.equal(describe({ id: "agitator", quantity: 2 }), "One per tank");
  assert.equal(describe({ id: "phProbe", quantity: 4 }), "2 per tank");
  assert.equal(describe({ id: "levelProbe", quantity: 3 }), "Tank-mounted");
  assert.equal(describe({ id: "tank", rating: "5 kL each" }), "5 kL each");
  assert.equal(describe({ id: "mystery" }), "Flow outside selection range");
});

test("equipment requests merge into the design's own selection", () => {
  const current = normalizeEquipmentEnabled();
  assert.deepEqual(equipmentSelectionForDesign(null, current, undefined), {
    equipmentEnabled: current,
    equipmentSource: "settings",
  });
  const design = {
    equipmentEnabled: normalizeEquipmentEnabled({ agitator: false }),
  };
  const result = equipmentSelectionForDesign(design, current, { tank: false });
  assert.equal(result.equipmentSource, "custom");
  assert.equal(result.equipmentEnabled.tank, false);
  assert.equal(result.equipmentEnabled.agitator, false);
  assert.equal(result.equipmentEnabled.feedPump, true);
});

test("unknown or non-boolean equipment requests are rejected", () => {
  const current = normalizeEquipmentEnabled();
  for (const requested of [{ laser: true }, { tank: "no" }, null])
    assert.throws(
      () => equipmentSelectionForDesign(null, current, requested),
      (error) => error.status === 400,
    );
});
