import { designConfig } from "../config/designConfig.js";

const TANK_MOUNTED = {
  agitator: "AG",
  phProbe: "PH",
  levelProbe: "LT",
  lowLevelSwitch: "LSLL",
  highLevelSwitch: "LSHL",
};
const SEQUENCED = {
  tank: "T",
  feedPump: "PU",
  dischargePump: "PU",
  causticDosingPump: "PU",
  acidDosingPump: "PU",
  dosingController: "DC",
  skidController: "DC",
  manualValve: "MV",
  nonReturnValve: "NRV",
  pressureReliefValve: "PRV",
  actuatedValve: "AV",
  coolingHx: "HX",
};

const pad = (number) => String(number).padStart(2, "0");

export function assignTags(items, tankCount) {
  const plant = designConfig.tagging.plant;
  const counters = {};
  for (const item of items) {
    const quantity = Number.isInteger(item.quantity) ? item.quantity : 0;
    if (item.id in SEQUENCED) {
      const prefix = SEQUENCED[item.id];
      item.tags = Array.from({ length: quantity }, () => {
        counters[prefix] = (counters[prefix] ?? 0) + 1;
        return `${plant}${prefix}${pad(counters[prefix])}`;
      });
    } else if (item.id in TANK_MOUNTED && tankCount > 0) {
      const perTank = Math.ceil(quantity / tankCount);
      item.tags = Array.from(
        { length: quantity },
        (_, index) =>
          `${plant}T${pad(Math.floor(index / perTank) + 1)}${TANK_MOUNTED[item.id]}${pad((index % perTank) + 1)}`,
      );
    }
  }
  return items;
}
