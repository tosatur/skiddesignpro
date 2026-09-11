import { z } from "zod";
import { designConfig } from "../config/designConfig.js";
import { parseMeasurement } from "../../shared/measurements.js";

const limits = designConfig.inputLimits;
const targetRange = designConfig.tradeWasteLimits.pH;
const targetMessage = `Target pH must be between ${targetRange.min.toFixed(1)} and ${targetRange.max.toFixed(1)}.`;
const concentration = z
  .union([z.string(), z.number().finite()])
  .transform(String)
  .pipe(
    z
      .string()
      .trim()
      .max(40)
      .refine((text) => {
        if (text === "") return true;
        const value = parseMeasurement(text);
        return value !== null && value.high <= limits.concentration;
      }, "Enter a non-negative concentration or a bound such as < 100."),
  );
const dimension = z.number().finite().positive().max(limits.dimension);
const inputSchema = z.object({
  designName: z
    .string()
    .trim()
    .min(1, "Enter a design name.")
    .max(limits.nameLength),
  clientName: z
    .string()
    .trim()
    .min(1, "Enter a client or facility.")
    .max(limits.nameLength),
  flowRate: z
    .number({ error: "Design flow rate must be numeric." })
    .finite()
    .positive("Design flow rate must be greater than 0.")
    .max(
      limits.flowRate,
      `Design flow rate must not exceed ${limits.flowRate} kL/h.`,
    ),
  dailyVolume: z
    .number({ error: "Daily wastewater volume must be numeric." })
    .finite()
    .positive("Daily wastewater volume must be greater than 0.")
    .max(
      limits.dailyVolume,
      `Daily wastewater volume must not exceed ${limits.dailyVolume} kL/day.`,
    ),
  inletPH: z
    .number({ error: "Inlet pH must be numeric." })
    .finite()
    .min(0, `Inlet pH must be between 0 and ${limits.pH}.`)
    .max(limits.pH, `Inlet pH must be between 0 and ${limits.pH}.`),
  targetPH: z
    .number({ error: "Target pH must be numeric." })
    .finite()
    .min(targetRange.min, targetMessage)
    .max(targetRange.max, targetMessage),
  temperature: z
    .number({ error: "Wastewater temperature must be numeric." })
    .finite()
    .min(
      0,
      `Wastewater temperature must be between 0 and ${limits.temperature} °C.`,
    )
    .max(
      limits.temperature,
      `Wastewater temperature must be between 0 and ${limits.temperature} °C.`,
    ),
  wastewaterProfile: z.enum(["typical", "custom"]),
  customWastewaterData: z
    .object(
      Object.fromEntries(
        designConfig.wastewater.map((p) => [p.key, concentration.default("")]),
      ),
    )
    .default({}),
  spaceConstraint: z.discriminatedUnion("type", [
    z.object({ type: z.literal("container") }),
    z.object({
      type: z.literal("custom"),
      length: dimension,
      width: dimension,
    }),
  ]),
  acidId: z
    .enum(
      designConfig.chemicals.filter((c) => c.type === "acid").map((c) => c.id),
    )
    .default(designConfig.defaults.acidId),
});

export function validateInputs(raw) {
  // Accept the JSON BOD5 name using the normal saved BOD field and validation.
  if (
    raw?.wastewaterProfile === "custom" &&
    raw.customWastewaterData?.bod5 !== undefined
  )
    raw = {
      ...raw,
      customWastewaterData: {
        ...raw.customWastewaterData,
        bod: raw.customWastewaterData.bod ?? raw.customWastewaterData.bod5,
      },
    };
  // Hidden custom inputs cannot override or invalidate the reference profile.
  const result = inputSchema.safeParse(
    raw?.wastewaterProfile === "typical"
      ? { ...raw, customWastewaterData: {} }
      : raw,
  );
  if (!result.success) {
    const error = new Error("Please check the highlighted fields.");
    error.status = 400;
    error.fields = Object.fromEntries(
      result.error.issues.map((i) => [i.path.join("."), i.message]),
    );
    throw error;
  }
  return result.data;
}
