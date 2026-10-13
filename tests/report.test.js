import { test } from "node:test";
import assert from "node:assert/strict";
import { Design } from "../backend/models/Design.js";
import { buildReport } from "../backend/services/report.js";
import { buildReportText } from "../backend/services/reportText.js";
import { generateReportPDF } from "../backend/services/reportPdf.js";

const design = (overrides = {}, equipmentEnabled) =>
  new Design(
    {
      designName: "Report design",
      clientName: "Client",
      flowRate: 20,
      dailyVolume: 200,
      inletPH: 11,
      targetPH: 7,
      temperature: 25,
      wastewaterProfile: "typical",
      spaceConstraint: { type: "container" },
      ...overrides,
    },
    null,
    { equipmentEnabled },
  );
const section = (report, title) =>
  report.sections.find((s) => s.title === title);

test("the report has every section in order", () => {
  const report = buildReport(design());
  assert.equal(report.title, "Report design");
  assert.equal(report.client, "Client");
  assert.deepEqual(
    report.sections.map((s) => s.title),
    [
      "Project Summary",
      "Design Inputs",
      "Proposed Equipment",
      "Chemical Dosing",
      "Trade Waste Check",
      "Electrical I/O",
      "Process Calculations",
      "2D Layout",
      "Approximate Cost",
      "Notes",
    ],
  );
});

test("every table row matches its column count", () => {
  for (const temperature of [25, 45]) {
    const report = buildReport(design({ temperature }));
    for (const s of report.sections)
      for (const table of s.tables ?? [])
        for (const row of table.rows)
          assert.equal(row.length, table.columns.length, s.title);
  }
});

test("a hot inlet adds the cooling duty to the process calculations", () => {
  const cool = section(buildReport(design()), "Process Calculations");
  const hot = section(
    buildReport(design({ temperature: 45 })),
    "Process Calculations",
  );
  assert.ok(hot.tables.length > cool.tables.length);
  assert.match(JSON.stringify(hot.tables), /kW/);
});

test("the plain-text export numbers sections and flattens whitespace", () => {
  const text = buildReportText({
    title: "  Plant\n A ",
    client: "Client",
    revision: 3,
    sections: [
      {
        title: "Summary",
        paragraphs: ["First\n\nparagraph", ""],
        callout: { text: "Check this" },
        tables: [
          {
            columns: ["Item", "Value"],
            rows: [
              ["Tank", 2],
              ["", null],
            ],
          },
          { columns: ["Empty"], rows: [] },
        ],
        notes: ["A note"],
      },
      { title: "Second" },
    ],
  });
  assert.equal(
    text,
    [
      "Design: Plant A",
      "Client: Client",
      "Revision: 3",
      "",
      "01 Summary",
      "First paragraph",
      "Check this",
      "Item\tValue",
      "Tank\t2",
      "A note",
      "",
      "02 Second",
      "",
    ].join("\n"),
  );
});

test("the full text export contains each section heading", () => {
  const text = buildReportText(buildReport(design()));
  assert.match(text, /^Design: Report design\n/);
  assert.match(text, /\n01 Project Summary\n/);
  assert.match(text, /\n10 Notes\n/);
  assert.ok(text.endsWith("\n"));
});

test("PDFs render for unusual designs", async () => {
  for (const [overrides, enabled] of [
    [{ temperature: 45 }],
    [{ flowRate: 500, dailyVolume: 5000 }],
    [{ spaceConstraint: { type: "custom", length: 1, width: 1 } }],
    [{}, { tank: false, causticDosingPump: false, acidDosingPump: false }],
    [
      {
        wastewaterProfile: "custom",
        customWastewaterData: { bod: "< 100", sulphur: "700" },
      },
    ],
  ]) {
    const pdf = await generateReportPDF(design(overrides, enabled));
    assert.equal(
      pdf.subarray(0, 4).toString(),
      "%PDF",
      JSON.stringify(overrides),
    );
  }
});
