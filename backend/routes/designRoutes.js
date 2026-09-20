import { Router } from "express";
import { Design, generateOutputs } from "../models/Design.js";
import { buildReport } from "../services/report.js";
import { buildReportText } from "../services/reportText.js";
import { generateReportPDF } from "../services/reportPdf.js";
import { designDisplay } from "../services/designDisplay.js";
import { exactSulphurTotal } from "../../shared/measurements.js";
import { validateInputs } from "../services/validation.js";

// Input-only imports share normal storage and calculations. Reads never write
// generated outputs back or change the revision of an imported design.
const withOutputs = (design) => {
  if (design.generated) return design;
  try {
    return {
      ...design,
      generated: generateOutputs(validateInputs(design.inputs)),
    };
  } catch (error) {
    if (error.fields)
      error.message = `${design.designName}: ${Object.values(error.fields).join(" ")}`;
    throw error;
  }
};

export function designRoutes(store, { testToolsEnabled = false } = {}) {
  const router = Router();
  router.get("/", (_req, res) =>
    res.json(
      store.list().map(({ id, designName, clientName, inputs, updatedAt }) => ({
        id,
        designName,
        clientName,
        inputs,
        updatedAt,
      })),
    ),
  );
  router.post("/", (req, res) =>
    res.status(201).json(store.create(new Design(req.body?.inputs))),
  );
  if (testToolsEnabled) {
    router.delete("/", (_req, res) => {
      res.json({ deleted: store.deleteAll() });
    });
    router.post("/import", (req, res) => {
      if (!Array.isArray(req.body))
        return res
          .status(400)
          .json({ error: "Supply a JSON array of design inputs." });
      const names = new Set(
        store.list().map((d) => d.designName.trim().toLowerCase()),
      );
      const summary = {
        supplied: req.body.length,
        imported: 0,
        rejected: [],
        skipped: [],
      };
      for (const [index, inputs] of req.body.entries()) {
        const label =
          typeof inputs?.designName === "string" && inputs.designName.trim()
            ? inputs.designName.trim()
            : `Entry ${index + 1}`;
        try {
          const design = new Design(inputs, null, { inputsOnly: true });
          const name = design.designName.toLowerCase();
          if (names.has(name)) {
            summary.skipped.push({
              designName: label,
              reason: "A design with this name already exists.",
            });
            continue;
          }
          if (exactSulphurTotal(design.inputs.customWastewaterData) !== null)
            design.inputs.customWastewaterData.sulphur = "";
          store.create(design);
          names.add(name);
          summary.imported++;
        } catch (error) {
          summary.rejected.push({
            designName: label,
            reason:
              error.status === 400
                ? Object.entries(error.fields)
                    .map(([field, message]) => `${field}: ${message}`)
                    .join("; ")
                : "Could not save this design. Please try again.",
          });
        }
      }
      res.json(summary);
    });
    router.get("/reports.txt", (_req, res) => {
      const designs = store.list();
      const text = designs.length
        ? designs
            .map((design) => buildReportText(buildReport(withOutputs(design))))
            .join("\n\n")
        : "No saved designs.\n";
      res
        .set({
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": 'attachment; filename="SPN-all-reports.txt"',
        })
        .send(text);
    });
  }
  router.param("id", (req, res, next, id) => {
    req.design = store.get(id);
    if (!req.design)
      return res.status(404).json({ error: "This design could not be found." });
    next();
  });
  router.get("/:id", (req, res) => {
    // Settings must remain accessible for correcting older invalid inputs.
    if (req.query.view === "settings") return res.json(req.design);
    const design = withOutputs(req.design);
    const display = designDisplay(design);
    res.json({
      ...design,
      display,
      report: buildReport(design, display),
    });
  });
  router.put("/:id", (req, res) => {
    if (req.body?.revision !== req.design.revision)
      return res
        .status(409)
        .json({ error: "This design has changed. Reopen it before editing." });
    res.json(
      store.update(
        new Design(req.body.inputs, req.design, {
          inputsOnly: !req.design.generated,
        }),
        req.design.revision,
      ),
    );
  });
  router.delete("/:id", (req, res) => {
    if (!store.delete(req.design.id))
      return res.status(404).json({ error: "This design could not be found." });
    res.json({ deleted: true });
  });
  router.get("/:id/report.pdf", async (req, res) => {
    if (
      req.query.revision &&
      Number(req.query.revision) !== req.design.revision
    )
      return res.status(409).json({
        error: "This design has changed. Reopen the report before exporting.",
      });
    const name =
      req.design.designName.replace(/[^a-z0-9_-]/gi, "-").slice(0, 70) ||
      "SPN-design";
    const pdf = await generateReportPDF(withOutputs(req.design));
    res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}-report.pdf"`,
      })
      .send(pdf);
  });
  return router;
}
