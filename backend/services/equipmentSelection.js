import { designConfig } from "../config/designConfig.js";

export function selectChemical(inputs) {
  const direction = Math.sign(inputs.targetPH - inputs.inletPH);
  const id =
    direction > 0
      ? designConfig.chemicals.find((c) => c.type === "caustic")?.id
      : direction < 0
        ? inputs.acidId
        : null;
  return {
    correction:
      direction > 0 ? "Raise pH" : direction < 0 ? "Lower pH" : "Maintain pH",
    chemical: designConfig.chemicals.find((c) => c.id === id) ?? null,
    capacityLH: null,
    control: direction === 0 ? "pH monitoring" : "pH feedback",
  };
}

export function selectEquipment(inputs, dosing) {
  const band = designConfig.tanks.flowBands.find(
    (b) => inputs.flowRate <= b.maxFlowKLH,
  );
  const sizeKL =
    band &&
    designConfig.tanks.standardSizesKL.find((size) => size >= band.sizeKL);
  const tank = { count: sizeKL ? band.count : null, sizeKL: sizeKL ?? null };
  const requiredPumpFlow =
    inputs.flowRate * (1 + designConfig.pumps.designMargin);
  const pump = {
    flowKLH:
      designConfig.pumps.ratingsKLH.find((q) => q >= requiredPumpFlow) ?? null,
    headM: null,
  };
  // Save the actual basis alongside the selection so later config changes cannot
  // silently change the explanation of an existing design.
  const sizing = {
    tank: sizeKL
      ? `Tank sizing basis (preliminary design assumption): flow band up to ${band.maxFlowKLH} kL/h selects ${tank.count} × ${tank.sizeKL} kL. Nominal residence time = ${tank.count * tank.sizeKL} kL / ${inputs.flowRate} kL/h × 60 = ${Number(((tank.count * tank.sizeKL * 60) / inputs.flowRate).toFixed(2))} minutes total. This is not an SPN-required residence time.`
      : "Tank sizing: design flow is outside the configured preliminary selection bands; detailed engineering required.",
    pump: `Feed and discharge pump basis: ${inputs.flowRate} kL/h + ${Number((designConfig.pumps.designMargin * 100).toFixed(2))}% configured preliminary allowance = ${Number(requiredPumpFlow.toFixed(2))} kL/h required. ${pump.flowKLH ? `Next configured nominal capacity at or above this flow: ${pump.flowKLH} kL/h each.` : "No configured nominal capacity covers this flow; detailed engineering required."}`,
  };
  const quantities = designConfig.equipment;
  const perTank = (count) => (tank.count === null ? null : tank.count * count);
  const items = [];
  const add = (id, name, quantity, rating, signal) => {
    if (quantity !== 0) items.push({ id, name, quantity, rating, signal });
  };
  add(
    "tank",
    "Balancing tank",
    tank.count,
    tank.sizeKL ? `${tank.sizeKL} kL each` : null,
  );
  const pumpRating = pump.flowKLH ? `${pump.flowKLH} kL/h` : null;
  add("feedPump", "Feed pump", quantities.feedPumps, pumpRating, "Output");
  add(
    "dischargePump",
    "Discharge pump",
    quantities.dischargePumps,
    pumpRating,
    "Output",
  );
  add(
    "agitator",
    "Agitator",
    perTank(quantities.agitatorsPerTank),
    null,
    "Output",
  );
  add(
    "phProbe",
    "pH measurement",
    perTank(quantities.pHProbesPerTank),
    null,
    "Input",
  );
  add(
    "levelProbe",
    "Level transmitter",
    perTank(quantities.levelProbesPerTank),
    null,
    "Input",
  );
  add(
    "lowLevelSwitch",
    "Low-level switch",
    perTank(quantities.lowLevelSwitchesPerTank),
    null,
    "Input",
  );
  add(
    "highLevelSwitch",
    "High-level switch",
    perTank(quantities.highLevelSwitchesPerTank),
    null,
    "Input",
  );
  if (dosing.chemical)
    add(
      "dosingPump",
      "Chemical dosing pump",
      quantities.dosingPumps,
      null,
      "Output",
    );
  add("controlPanel", "Control panel / HMI", quantities.controlPanels, null);
  const equipment = { tank, pump, items, sizing };
  for (const item of items)
    item.details = equipmentDetails(item, equipment, dosing);
  return equipment;
}

// Also describes older saved selections without selecting any new equipment.
export function equipmentDetails(item, equipment, dosing) {
  if (item.details) return item.details;
  if (item.rating) return item.rating;
  if (
    [
      "agitator",
      "phProbe",
      "levelProbe",
      "lowLevelSwitch",
      "highLevelSwitch",
    ].includes(item.id)
  ) {
    const perTank = item.quantity / equipment.tank.count;
    return equipment.tank.count && Number.isInteger(perTank) && perTank > 0
      ? perTank === 1
        ? "One per tank"
        : `${perTank} per tank`
      : "Tank-mounted";
  }
  if (item.id === "dosingPump")
    return dosing.chemical?.type === "acid"
      ? "Acid dosing"
      : dosing.chemical?.type === "caustic"
        ? "Caustic dosing"
        : "pH feedback dosing";
  if (item.id === "controlPanel") return "Skid control";
  return "Flow outside selection range";
}

export function generateIOList(equipment) {
  return equipment.items
    .filter((item) => item.signal)
    .map(({ name, quantity, signal }) => ({
      name: signal === "Output" ? `${name} command` : name,
      quantity,
      direction: signal,
    }))
    .sort((a, b) => a.direction.localeCompare(b.direction));
}
