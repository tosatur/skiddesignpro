import { Router } from "express";
import { Design, withOutputs, withUpdatedPrices } from "../models/Design.js";
import { buildReport } from "../services/report.js";
import { generateReportPDF } from "../services/reportPdf.js";
import { designDisplay } from "../services/designDisplay.js";
import { equipmentSelectionForDesign } from "../services/equipmentSettings.js";

// Stateless equivalents of the /api/designs routes, for the desktop app's
// native open/save flow: the frontend (not a managed folder) holds the
// authoritative copy of a design and decides where it lives on disk, so
// these compute from a posted design instead of a stored one and never
// write anything themselves.
export function designToolsRoutes(prices, settings) {
  const router = Router();
  const priceBook = () => prices?.book();

  router.post("/compute", (req, res) => {
    res.json(
      new Design(req.body?.inputs, req.body?.previous ?? null, {
        priceBook: priceBook(),
        equipmentEnabled:
          req.body?.previous?.equipmentSource === "custom"
            ? req.body.previous.equipmentEnabled
            : settings?.get().equipmentEnabled,
        equipmentSource:
          req.body?.previous?.equipmentSource === "custom"
            ? "custom"
            : "settings",
      }),
    );
  });

  router.post("/view", (req, res) => {
    const design = withOutputs(req.body, priceBook());
    const display = designDisplay(design);
    res.json({ ...design, display, report: buildReport(design, display) });
  });
  router.post("/equipment", (req, res) => {
    const design = req.body?.design;
    if (!design || req.body?.revision !== design.revision)
      return res.status(409).json({
        error: "This design has changed. Reopen it before updating equipment.",
      });
    res.json(
      new Design(design.inputs, design, {
        priceBook: priceBook(),
        ...equipmentSelectionForDesign(
          design,
          settings?.get().equipmentEnabled,
          req.body.equipmentEnabled,
        ),
      }),
    );
  });
  router.post("/quotes", (req, res) => {
    const design = req.body?.design;
    if (!design || req.body?.revision !== design.revision)
      return res.status(409).json({
        error: "This design has changed. Reopen it before editing quotes.",
      });
    res.json(withUpdatedPrices(design, req.body.priceOverrides, priceBook()));
  });

  router.post("/report.pdf", async (req, res) => {
    const design = withOutputs(req.body, priceBook());
    const name =
      design.designName.replace(/[^a-z0-9_-]/gi, "-").slice(0, 70) ||
      "SPN-design";
    const pdf = await generateReportPDF(design);
    res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}-report.pdf"`,
      })
      .send(pdf);
  });

  return router;
}
