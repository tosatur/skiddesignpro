import { designConfig } from "../config/designConfig.js";

export function estimateCost(equipment) {
  const costs = designConfig.costs;
  const lines = equipment.items
    .filter(
      (item) =>
        !["levelProbe", "lowLevelSwitch", "highLevelSwitch"].includes(item.id),
    )
    .map((item) => {
      const unitCost =
        item.id === "tank"
          ? costs.tanks[equipment.tank.sizeKL]
          : ["feedPump", "dischargePump"].includes(item.id)
            ? costs.pumps[equipment.pump.flowKLH]
            : costs[item.id];
      return {
        id: item.id,
        name:
          item.id === "phProbe"
            ? "pH instrumentation"
            : item.id === "dosingPump"
              ? "Chemical dosing system"
              : item.name,
        quantity: item.quantity,
        unitCost: unitCost ?? null,
        amount:
          item.quantity != null && unitCost != null
            ? item.quantity * unitCost
            : null,
      };
    });
  // Package allowances keep related items together without double-counting.
  // Unit rates are editable budget inputs, ready to replace with vendor prices.
  const levelItems = equipment.items.some((item) =>
    ["levelProbe", "lowLevelSwitch", "highLevelSwitch"].includes(item.id),
  );
  for (const [id, name, quantity, unitCost] of [
    ...(levelItems
      ? [
          [
            "levelInstrumentation",
            "Level instrumentation (LT, low/high switches)",
            equipment.tank.count,
            costs.levelInstrumentation,
          ],
        ]
      : []),
    ["fabrication", "Skid frame / fabrication", 1, costs.fabrication],
    [
      "pipingValvesAssembly",
      "Piping, valves and assembly",
      1,
      costs.pipingValvesAssembly,
    ],
  ])
    lines.push({
      id,
      name,
      quantity,
      unitCost: unitCost ?? null,
      amount: quantity != null && unitCost != null ? quantity * unitCost : null,
    });
  const complete = lines.every((line) => line.amount !== null);
  const subtotal = lines.reduce((total, line) => total + (line.amount ?? 0), 0);
  return {
    currency: costs.currency,
    uncertainty: costs.uncertainty,
    lines,
    complete,
    subtotal: complete ? subtotal : null,
    low: complete
      ? Math.floor((subtotal * (1 - costs.uncertainty)) / costs.rounding) *
        costs.rounding
      : null,
    high: complete
      ? Math.ceil((subtotal * (1 + costs.uncertainty)) / costs.rounding) *
        costs.rounding
      : null,
  };
}
