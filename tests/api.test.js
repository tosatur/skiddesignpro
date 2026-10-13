import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../backend/app.js";
import { DesignStore } from "../backend/db/DesignStore.js";
import { PriceLibrary } from "../backend/db/PriceLibrary.js";
import { AppSettings } from "../backend/db/AppSettings.js";

let server;
let base;
let store;

const inputs = (overrides = {}) => ({
  designName: "API design",
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

const request = async (method, path, body, headers = {}) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body:
      body === undefined || typeof body === "string"
        ? body
        : JSON.stringify(body),
  });
  const type = response.headers.get("Content-Type") ?? "";
  const data = type.includes("json")
    ? await response.json()
    : type.includes("pdf")
      ? Buffer.from(await response.arrayBuffer())
      : await response.text();
  return { status: response.status, headers: response.headers, data };
};
const create = async (overrides) =>
  (await request("POST", "/api/designs", { inputs: inputs(overrides) })).data;
const setDevMode = (devMode) =>
  request("PUT", "/api/settings/dev-mode", { devMode });

before(async () => {
  store = new DesignStore(":memory:");
  const app = createApp(store, {
    prices: new PriceLibrary(":memory:"),
    settings: new AppSettings(),
  });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test("health and config respond with security headers", async () => {
  const health = await request("GET", "/api/health");
  assert.deepEqual(health.data, { status: "ok" });
  assert.equal(health.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(health.headers.get("Cache-Control"), "no-store");
  assert.equal(health.headers.get("X-Powered-By"), null);
  const config = await request("GET", "/api/config");
  assert.equal(config.data.devMode, false);
  assert.equal(config.data.inputLimits.pH, 14);
  assert.ok(config.data.chemicals.length > 0);
});

test("unknown API paths return JSON 404s", async () => {
  const response = await request("GET", "/api/nothing");
  assert.equal(response.status, 404);
  assert.equal(response.data.error, "API endpoint not found.");
});

test("cross-origin writes are refused", async () => {
  const blocked = await request(
    "POST",
    "/api/designs",
    { inputs: inputs() },
    { Origin: "http://evil.example" },
  );
  assert.equal(blocked.status, 403);
  const vite = await request(
    "POST",
    "/api/designs",
    { inputs: inputs({ designName: "From Vite" }) },
    { Origin: "http://localhost:5173" },
  );
  assert.equal(vite.status, 201);
  const sameHost = await request(
    "POST",
    "/api/designs",
    { inputs: inputs({ designName: "Same host" }) },
    { Origin: base },
  );
  assert.equal(sameHost.status, 201);
  const read = await request("GET", "/api/health", undefined, {
    Origin: "http://evil.example",
  });
  assert.equal(read.status, 200);
});

test("malformed and oversized bodies are rejected", async () => {
  const malformed = await request("POST", "/api/designs", "{nope");
  assert.equal(malformed.status, 400);
  const huge = await request("POST", "/api/designs", {
    inputs: inputs({ designName: "x".repeat(200_000) }),
  });
  assert.equal(huge.status, 413);
});

test("invalid inputs return field messages", async () => {
  const response = await request("POST", "/api/designs", {
    inputs: inputs({ flowRate: -1 }),
  });
  assert.equal(response.status, 400);
  assert.equal(
    response.data.fields.flowRate,
    "Design flow rate must be greater than 0.",
  );
});

test("a design can be created, listed, read, edited and deleted", async () => {
  const created = await create({ designName: "Lifecycle" });
  assert.equal(created.revision, 1);
  assert.ok(created.generated.cost.subtotal > 0);

  const list = await request("GET", "/api/designs");
  const summary = list.data.find((d) => d.id === created.id);
  assert.deepEqual(Object.keys(summary).sort(), [
    "clientName",
    "designName",
    "id",
    "inputs",
    "updatedAt",
  ]);

  const view = await request("GET", `/api/designs/${created.id}`);
  assert.ok(view.data.report.sections.length > 0);
  assert.ok(view.data.display.spaceCheck);
  const settings = await request(
    "GET",
    `/api/designs/${created.id}?view=settings`,
  );
  assert.equal(settings.data.report, undefined);

  const stale = await request("PUT", `/api/designs/${created.id}`, {
    revision: 0,
    inputs: inputs({ designName: "Lifecycle" }),
  });
  assert.equal(stale.status, 409);
  const edited = await request("PUT", `/api/designs/${created.id}`, {
    revision: 1,
    inputs: inputs({ designName: "Lifecycle", flowRate: 40 }),
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.revision, 2);
  assert.equal(edited.data.createdAt, created.createdAt);
  assert.equal(edited.data.generated.equipment.tank.sizeKL, 10);

  assert.equal(
    (await request("DELETE", `/api/designs/${created.id}`)).status,
    200,
  );
  assert.equal(
    (await request("DELETE", `/api/designs/${created.id}`)).status,
    404,
  );
});

test("unknown and unsafe design ids are not found", async () => {
  for (const id of ["missing", "..%2Fsecret", "a.b"]) {
    const response = await request("GET", `/api/designs/${id}`);
    assert.equal(response.status, 404, id);
  }
});

test("design quotes update the cost without changing equipment", async () => {
  const created = await create({ designName: "Quoted" });
  const stale = await request("PUT", `/api/designs/${created.id}/quotes`, {
    revision: 5,
    priceOverrides: {},
  });
  assert.equal(stale.status, 409);
  const quoted = await request("PUT", `/api/designs/${created.id}/quotes`, {
    revision: 1,
    priceOverrides: { tank: { unitCost: 4321, quoteRef: "Q-77" } },
  });
  assert.equal(quoted.data.revision, 2);
  const tank = quoted.data.generated.cost.lines.find((l) => l.id === "tank");
  assert.equal(tank.basis, "quoted");
  assert.equal(tank.unitCost, 4321);
  assert.deepEqual(
    quoted.data.generated.equipment,
    created.generated.equipment,
  );
  const invalid = await request("PUT", `/api/designs/${created.id}/quotes`, {
    revision: 2,
    priceOverrides: { tank: { unitCost: "lots" } },
  });
  assert.equal(invalid.status, 400);
});

test("a custom equipment selection survives later input edits", async () => {
  const created = await create({ designName: "Custom equipment" });
  const updated = await request(
    "POST",
    `/api/designs/${created.id}/equipment`,
    { revision: 1, equipmentEnabled: { agitator: false } },
  );
  assert.equal(updated.data.equipmentSource, "custom");
  assert.ok(
    !updated.data.generated.equipment.items.some((i) => i.id === "agitator"),
  );
  const edited = await request("PUT", `/api/designs/${created.id}`, {
    revision: 2,
    inputs: inputs({ designName: "Custom equipment", flowRate: 15 }),
  });
  assert.equal(edited.data.equipmentSource, "custom");
  assert.equal(edited.data.equipmentEnabled.agitator, false);
  const unknown = await request(
    "POST",
    `/api/designs/${created.id}/equipment`,
    { revision: 3, equipmentEnabled: { laser: true } },
  );
  assert.equal(unknown.status, 400);
  const stale = await request("POST", `/api/designs/${created.id}/equipment`, {
    revision: 1,
  });
  assert.equal(stale.status, 409);
});

test("the PDF report downloads with a safe filename", async () => {
  const created = await create({ designName: 'Plant "A"/B' });
  const pdf = await request("GET", `/api/designs/${created.id}/report.pdf`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("Content-Type"), "application/pdf");
  assert.equal(
    pdf.headers.get("Content-Disposition"),
    'attachment; filename="Plant--A--B-report.pdf"',
  );
  assert.equal(pdf.data.subarray(0, 4).toString(), "%PDF");
  const stale = await request(
    "GET",
    `/api/designs/${created.id}/report.pdf?revision=9`,
  );
  assert.equal(stale.status, 409);
});

test("dev tools need Dev Mode", async () => {
  await setDevMode(false);
  for (const [method, path, body] of [
    ["DELETE", "/api/designs"],
    ["POST", "/api/designs/import", []],
    ["GET", "/api/designs/reports.txt"],
  ])
    assert.equal((await request(method, path, body)).status, 403, path);
  const invalid = await request("PUT", "/api/settings/dev-mode", {
    devMode: "on",
  });
  assert.equal(invalid.status, 400);
});

test("bulk import, text export and delete all", async () => {
  assert.deepEqual((await setDevMode(true)).data, { devMode: true });
  assert.equal((await request("GET", "/api/config")).data.devMode, true);
  try {
    await create({ designName: "Existing" });
    const notArray = await request("POST", "/api/designs/import", {});
    assert.equal(notArray.status, 400);

    const summary = await request("POST", "/api/designs/import", [
      inputs({ designName: "Imported" }),
      inputs({ designName: " existing " }),
      inputs({ designName: "Broken", flowRate: 0 }),
      inputs({ designName: "" }),
      inputs({
        designName: "Exact sulphur",
        wastewaterProfile: "custom",
        customWastewaterData: {
          sulphate: "1",
          sulphite: "2",
          thiosulphate: "3",
          sulphur: "9",
        },
      }),
    ]);
    assert.equal(summary.data.supplied, 5);
    assert.equal(summary.data.imported, 2);
    assert.deepEqual(summary.data.skipped, [
      {
        designName: "existing",
        reason: "A design with this name already exists.",
      },
    ]);
    assert.deepEqual(
      summary.data.rejected.map((r) => r.designName),
      ["Broken", "Entry 4"],
    );
    assert.match(summary.data.rejected[0].reason, /^flowRate: /);

    const imported = store.list().find((d) => d.designName === "Exact sulphur");
    assert.equal(imported.generated, undefined);
    assert.equal(imported.inputs.customWastewaterData.sulphur, "");
    const view = await request("GET", `/api/designs/${imported.id}`);
    assert.equal(view.status, 200);
    assert.equal(view.data.revision, 1);

    const text = await request("GET", "/api/designs/reports.txt");
    assert.match(
      text.headers.get("Content-Disposition"),
      /SPN-all-reports\.txt/,
    );
    assert.match(text.data, /Design: Imported/);
    assert.match(text.data, /Design: Existing/);

    const deleted = await request("DELETE", "/api/designs");
    assert.ok(deleted.data.deleted >= 3);
    assert.deepEqual((await request("GET", "/api/designs")).data, []);
    const empty = await request("GET", "/api/designs/reports.txt");
    assert.equal(empty.data, "No saved designs.\n");
  } finally {
    await setDevMode(false);
  }
});

test("library prices are validated and applied to new designs", async () => {
  const list = await request("GET", "/api/prices");
  assert.ok(list.data.some((p) => p.key === "tank:5"));
  const invalid = await request("PUT", "/api/prices/tank:5", { unitCost: 0 });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.data.fields.unitCost);
  const unknown = await request("PUT", "/api/prices/tank:7", {
    unitCost: 10,
  });
  assert.equal(unknown.status, 404);
  const saved = await request("PUT", "/api/prices/tank:5", {
    unitCost: 7000,
    quoteRef: " Q-5 ",
  });
  assert.equal(saved.data.status, "quoted");
  assert.equal(saved.data.quoteRef, "Q-5");
  try {
    const design = await create({ designName: "Library priced" });
    const tank = design.generated.cost.lines.find((l) => l.id === "tank");
    assert.equal(tank.basis, "library");
    assert.equal(tank.unitCost, 7000);
    assert.equal(tank.quoteRef, "Q-5");
  } finally {
    const reset = await request("DELETE", "/api/prices/tank:5");
    assert.equal(reset.data.unitCost, 6000);
  }
  assert.equal((await request("DELETE", "/api/prices/tank:7")).status, 404);
});

test("equipment defaults apply to new designs", async () => {
  const current = await request("GET", "/api/settings/equipment");
  assert.ok(current.data.options.some((o) => o.id === "coolingHx"));
  assert.equal(current.data.enabled.agitator, true);
  const invalid = await request("PUT", "/api/settings/equipment", {
    agitator: "no",
  });
  assert.equal(invalid.status, 400);
  const saved = await request("PUT", "/api/settings/equipment", {
    agitator: false,
  });
  assert.equal(saved.data.enabled.agitator, false);
  try {
    const design = await create({ designName: "No agitator" });
    assert.equal(design.equipmentSource, "settings");
    assert.ok(
      !design.generated.equipment.items.some((i) => i.id === "agitator"),
    );
  } finally {
    await request("PUT", "/api/settings/equipment", { agitator: true });
  }
});

test("design tools compute without saving anything", async () => {
  const before = store.list().length;
  const computed = await request("POST", "/api/design-tools/compute", {
    inputs: inputs({ designName: "Desktop file" }),
  });
  assert.equal(computed.status, 200);
  assert.equal(computed.data.revision, 1);
  const next = await request("POST", "/api/design-tools/compute", {
    inputs: inputs({ designName: "Desktop file", flowRate: 30 }),
    previous: computed.data,
  });
  assert.equal(next.data.id, computed.data.id);
  assert.equal(next.data.revision, 2);

  const view = await request("POST", "/api/design-tools/view", next.data);
  assert.ok(view.data.report.sections.length > 0);

  const quoted = await request("POST", "/api/design-tools/quotes", {
    design: next.data,
    revision: 2,
    priceOverrides: { feedPump: { unitCost: 999 } },
  });
  assert.equal(quoted.data.revision, 3);
  const stale = await request("POST", "/api/design-tools/quotes", {
    design: next.data,
    revision: 1,
  });
  assert.equal(stale.status, 409);

  const equipment = await request("POST", "/api/design-tools/equipment", {
    design: quoted.data,
    revision: 3,
    equipmentEnabled: { coolingHx: false },
  });
  assert.equal(equipment.data.equipmentSource, "custom");
  const missing = await request("POST", "/api/design-tools/equipment", {});
  assert.equal(missing.status, 409);

  const pdf = await request("POST", "/api/design-tools/report.pdf", next.data);
  assert.equal(pdf.data.subarray(0, 4).toString(), "%PDF");
  assert.equal(store.list().length, before);
});
