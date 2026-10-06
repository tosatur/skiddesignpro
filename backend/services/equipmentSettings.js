import { z } from "zod";
import {
  equipmentOptions,
  normalizeEquipmentEnabled,
} from "../config/equipmentOptions.js";

export const equipmentSchema = z.strictObject(
  Object.fromEntries(
    equipmentOptions.map(({ id }) => [id, z.boolean().optional()]),
  ),
);

export function equipmentSelectionForDesign(design, current, requested) {
  if (requested === undefined)
    return { equipmentEnabled: current, equipmentSource: "settings" };
  const result = equipmentSchema.safeParse(requested);
  if (!result.success) {
    const error = new Error(
      "Choose enabled or disabled for a known equipment item.",
    );
    error.status = 400;
    throw error;
  }
  return {
    equipmentEnabled: normalizeEquipmentEnabled({
      ...(design?.equipmentEnabled ?? current),
      ...result.data,
    }),
    equipmentSource: "custom",
  };
}
