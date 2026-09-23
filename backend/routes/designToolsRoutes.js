import { Router } from "express";
import { Design, withOutputs } from "../models/Design.js";
import { buildReport } from "../services/report.js";
import { generateReportPDF } from "../services/reportPdf.js";
import { designDisplay } from "../services/designDisplay.js";

// Stateless equivalents of the /api/designs routes, for the desktop app's
// native open/save flow: the frontend (not a managed folder) holds the
// authoritative copy of a design and decides where it lives on disk, so
// these compute from a posted design instead of a stored one and never
// write anything themselves.
export function designToolsRoutes() {
  const router = Router();

  router.post("/compute", (req, res) => {
    res.json(new Design(req.body?.inputs, req.body?.previous ?? null));
  });

  router.post("/view", (req, res) => {
    const design = withOutputs(req.body);
    const display = designDisplay(design);
    res.json({ ...design, display, report: buildReport(design, display) });
  });

  router.post("/report.pdf", async (req, res) => {
    const design = withOutputs(req.body);
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
