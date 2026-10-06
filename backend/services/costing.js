import { designConfig } from "../config/designConfig.js";
import { PriceLibrary } from "../db/PriceLibrary.js";

const DOSING_PUMPS = ["dosingPump", "causticDosingPump", "acidDosingPump"];
const PACKAGED = [
  "levelProbe",
  "lowLevelSwitch",
  "highLevelSwitch",
  "manualValve",
  "nonReturnValve",
  "pressureReliefValve",
  "actuatedValve",
  "overflow",
  "recirculation",
];

const priceKey = (id, equipment) =>
  id === "tank"
    ? equipment.tank.sizeKL
      ? `tank:${equipment.tank.sizeKL}`
      : null
    : ["feedPump", "dischargePump"].includes(id)
      ? equipment.pump.flowKLH
        ? `pump:${equipment.pump.flowKLH}`
        : null
      : DOSING_PUMPS.includes(id)
        ? "dosingPump"
        : id === "controlPanel"
          ? "skidController"
          : id;

export const configPriceBook = () => new PriceLibrary(":memory:").book();

export function estimateCost(
  equipment,
  priceBook = configPriceBook(),
  overrides = {},
) {
  const costs = designConfig.costs;
  const line = (id, name, quantity) => {
    const key = priceKey(id, equipment);
    const override = overrides[id];
    const price = priceBook[key];
    const unitCost = override?.unitCost ?? price?.unitCost ?? null;
    const basis = override
      ? "quoted"
      : price?.status === "quoted"
        ? "library"
        : "estimate";
    return {
      id,
      name,
      priceKey: key,
      quantity,
      unitCost,
      amount: quantity != null && unitCost != null ? quantity * unitCost : null,
      basis,
      quoteRef:
        override?.quoteRef ?? (basis === "library" ? price.quoteRef : ""),
    };
  };
  const lines = equipment.items
    .filter((item) => !PACKAGED.includes(item.id))
    .map((item) =>
      line(
        item.id,
        item.id === "phProbe"
          ? "pH instrumentation"
          : item.id === "dosingPump"
            ? "Chemical dosing system"
            : item.id === "causticDosingPump"
              ? "Caustic dosing system"
              : item.id === "acidDosingPump"
                ? "Acid dosing system"
                : item.name,
        item.quantity,
      ),
    );
  // Package allowances keep related items together without double-counting.
  // Unit rates are editable budget inputs, ready to replace with vendor prices.
  const levelItems = equipment.items.some((item) =>
    ["levelProbe", "lowLevelSwitch", "highLevelSwitch"].includes(item.id),
  );
  if (levelItems)
    lines.push(
      line(
        "levelInstrumentation",
        "Level instrumentation (per tank package)",
        equipment.tank.count,
      ),
    );
  if (equipment.items.length)
    lines.push(
      line("fabrication", "Skid frame / fabrication", 1),
      line("pipingValvesAssembly", "Piping, valves and assembly", 1),
    );
  const complete = lines.every((l) => l.amount !== null);
  const sum = (filter) =>
    lines.filter(filter).reduce((total, l) => total + (l.amount ?? 0), 0);
  const subtotal = sum(() => true);
  const quoted = sum((l) => l.basis !== "estimate");
  const estimated = subtotal - quoted;
  const u = costs.uncertainty;
  return {
    currency: costs.currency,
    uncertainty: u,
    lines,
    complete,
    subtotal: complete ? subtotal : null,
    quoted: complete ? quoted : null,
    quotedShare: complete && subtotal ? quoted / subtotal : null,
    low: complete
      ? Math.floor((quoted + estimated * (1 - u)) / costs.rounding) *
        costs.rounding
      : null,
    high: complete
      ? Math.ceil((quoted + estimated * (1 + u)) / costs.rounding) *
        costs.rounding
      : null,
  };
}
