import { Router } from "express";
import { z } from "zod";
import { equipmentOptions } from "../config/equipmentOptions.js";
import { equipmentSchema } from "../services/equipmentSettings.js";

export function settingsRoutes(settings) {
  const router = Router();
  router.put("/dev-mode", (req, res) => {
    const result = z.strictObject({ devMode: z.boolean() }).safeParse(req.body);
    if (!result.success)
      return res
        .status(400)
        .json({ error: "Choose enabled or disabled for Dev Mode." });
    res.json({ devMode: settings.setDevMode(result.data.devMode).devMode });
  });
  router.get("/equipment", (_req, res) =>
    res.json({
      options: equipmentOptions,
      enabled: settings.get().equipmentEnabled,
    }),
  );
  router.put("/equipment", (req, res) => {
    const result = equipmentSchema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({
        error: "Choose enabled or disabled for a known equipment item.",
      });
    res.json({
      options: equipmentOptions,
      enabled: settings.updateEquipment(result.data).equipmentEnabled,
    });
  });
  return router;
}
