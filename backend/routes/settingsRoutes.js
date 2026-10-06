import { Router } from "express";
import { z } from "zod";
import { equipmentOptions } from "../config/equipmentOptions.js";

const equipmentSchema = z.strictObject(
  Object.fromEntries(
    equipmentOptions.map(({ id }) => [id, z.boolean().optional()]),
  ),
);

export function settingsRoutes(settings) {
  const router = Router();
  router.get("/equipment", (_req, res) =>
    res.json({
      options: equipmentOptions,
      enabled: settings.get().equipmentEnabled,
    }),
  );
  router.put("/equipment", (req, res) => {
    const result = equipmentSchema.safeParse(req.body);
    if (!result.success)
      return res
        .status(400)
        .json({
          error: "Choose enabled or disabled for a known equipment item.",
        });
    res.json({
      options: equipmentOptions,
      enabled: settings.updateEquipment(result.data).equipmentEnabled,
    });
  });
  return router;
}
