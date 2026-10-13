import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Design, withOutputs } from "../backend/models/Design.js";
import { PriceLibrary } from "../backend/db/PriceLibrary.js";
import { estimateCost } from "../backend/services/costing.js";
import { summariseIO } from "../backend/services/equipmentSelection.js";
import { sizePipe, coolingDuty } from "../backend/services/processCalcs.js";
import { buildReport } from "../backend/services/report.js";
import { designDisplay } from "../backend/services/designDisplay.js";
import { generateReportPDF } from "../backend/services/reportPdf.js";

const inputs = (overrides = {}) => ({
  designName: "Test",
  clientName: "Client",
  flowRate: 80,
  dailyVolume: 800,
  inletPH: 11,
  targetPH: 7,
  temperature: 30,
  wastewaterProfile: "typical",
  spaceConstraint: { type: "container" },
  ...overrides,
});
const tags = (design) =>
  design.generated.equipment.items.flatMap((item) => item.tags ?? []);

test("two-tank design carries the P&ID tag set", () => {
  const all = tags(new Design(inputs()));
  for (const tag of [
    "100T01",
    "100T02",
    "100PU01",
    "100PU02",
    "100PU03",
    "100PU04",
    "100DC01",
    "100DC02",
    "100T01PH01",
    "100T02PH01",
    "100T01LT01",
    "100T02LSHL01",
    "100MV04",
    "100NRV02",
    "100PRV02",
    "100AV02",
  ])
    assert.ok(all.includes(tag), tag);
  assert.equal(new Set(all).size, all.length);
});

test("both dosing trains are fitted whatever the inlet pH", () => {
  for (const inletPH of [4, 7, 11]) {
    const ids = new Design(inputs({ inletPH })).generated.equipment.items.map(
      (item) => item.id,
    );
    assert.ok(ids.includes("causticDosingPump"));
    assert.ok(ids.includes("acidDosingPump"));
  }
});

test("I/O counts per controller", () => {
  const design = new Design(inputs());
  const rows = summariseIO(
    design.generated.ioList,
    design.generated.equipment.items,
  );
  const skid = rows.find((row) => row.controller.startsWith("100DC02"));
  const dosing = rows.find((row) => row.controller.startsWith("100DC01"));
  assert.deepEqual(
    [skid.AI, skid.AO, skid.DI, skid.DO, skid.total],
    [2, 0, 10, 6, 18],
  );
  assert.deepEqual(
    [dosing.AI, dosing.AO, dosing.DI, dosing.DO, dosing.total],
    [2, 2, 2, 0, 6],
  );
});

test("pipe sizing picks the smallest size under the velocity limit", () => {
  const pipe = sizePipe(50);
  assert.equal(pipe.dn, 100);
  assert.ok(Math.abs(pipe.velocity - 1.51) < 0.01);
  assert.equal(sizePipe(5).dn, 25);
});

test("cooling duty above the discharge temperature limit", () => {
  assert.equal(coolingDuty(inputs({ temperature: 38 })), null);
  const duty = coolingDuty(inputs({ flowRate: 50, temperature: 45 }));
  assert.ok(Math.abs(duty.dutyKW - 406.4) < 0.1);
  const design = new Design(inputs({ flowRate: 50, temperature: 45 }));
  const hx = design.generated.equipment.items.find(
    (item) => item.id === "coolingHx",
  );
  assert.deepEqual(hx.tags, ["100HX01"]);
});

test("price precedence: design quote, then library quote, then estimate", () => {
  const prices = new PriceLibrary(":memory:");
  const equipment = new Design(inputs({ flowRate: 8 })).generated.equipment;
  const base = estimateCost(equipment, prices.book());
  assert.equal(base.lines[0].basis, "estimate");
  assert.equal(base.low, 16800);
  assert.equal(base.high, 25400);

  prices.set("tank:2", { unitCost: 5000, status: "quoted", quoteRef: "Q-1" });
  const library = estimateCost(equipment, prices.book());
  assert.equal(library.lines[0].basis, "library");
  assert.equal(library.lines[0].unitCost, 5000);

  const quoted = estimateCost(equipment, prices.book(), {
    tank: { unitCost: 4000, quoteRef: "Q-2" },
  });
  assert.equal(quoted.lines[0].basis, "quoted");
  assert.equal(quoted.lines[0].unitCost, 4000);

  const estimated = quoted.subtotal - quoted.quoted;
  assert.equal(
    quoted.low,
    Math.floor((quoted.quoted + estimated * 0.8) / 100) * 100,
  );
  assert.equal(
    quoted.high,
    Math.ceil((quoted.quoted + estimated * 1.2) / 100) * 100,
  );

  prices.reset("tank:2");
  assert.equal(prices.book()["tank:2"].status, "estimate");
  assert.equal(prices.book()["tank:2"].unitCost, 3500);
});

test("invalid quotes are rejected", () => {
  assert.throws(
    () => new Design(inputs({ priceOverrides: { tank: { unitCost: -1 } } })),
    (error) => error.status === 400,
  );
});

test("an older saved design still renders a report and PDF", async () => {
  const saved = JSON.parse(
    readFileSync(
      new URL("./fixtures/older-design.spnd", import.meta.url),
      "utf8",
    ),
  );
  const design = withOutputs(saved);
  const report = buildReport(design, designDisplay(design));
  assert.ok(report.sections.length > 0);
  const pdf = await generateReportPDF(design);
  assert.ok(pdf.length > 1000);
});

test("unsized lines have no library price key", () => {
  const cost = new Design(inputs({ flowRate: 500, dailyVolume: 5000 }))
    .generated.cost;
  const keyOf = (id) => cost.lines.find((line) => line.id === id).priceKey;
  assert.equal(keyOf("tank"), null);
  assert.equal(keyOf("feedPump"), null);
  assert.equal(keyOf("dosingController"), "dosingController");
});

test("small and medium skids without cooling fit the container", () => {
  for (const flowRate of [2, 5, 8, 10, 15, 20, 25]) {
    const layout = new Design(inputs({ flowRate, dailyVolume: 300 })).generated
      .layout;
    assert.equal(layout.spaceCheck.tone, "within", `${flowRate} kL/h`);
  }
});

test("design store refuses ids that could leave the data folder", async () => {
  const { DesignStore } = await import("../backend/db/DesignStore.js");
  const store = new DesignStore(":memory:");
  for (const id of ["../outside/decoy", "..\\outside\\decoy", "a/b", ""]) {
    assert.equal(store.get(id), null, id);
    assert.equal(store.delete(id), false, id);
  }
  assert.throws(() => store.create({ id: "../x" }));
});

test("small and medium skids with cooling fit the container", () => {
  for (const flowRate of [2, 8, 15, 25]) {
    const layout = new Design(
      inputs({ flowRate, dailyVolume: 300, temperature: 45 }),
    ).generated.layout;
    assert.equal(layout.spaceCheck.tone, "within", `${flowRate} kL/h`);
  }
});
