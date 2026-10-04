import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { designConfig } from "../config/designConfig.js";
import { atomicWriteFile } from "../util/atomicWrite.js";

const FILE = "prices.json";
const LABELS = {
  agitator: "Agitator",
  phProbe: "pH instrumentation",
  levelInstrumentation: "Level instrumentation (per tank)",
  dosingPump: "Chemical dosing system (per train)",
  dosingController: "Dosing controller",
  skidController: "Skid controller / HMI",
  fabrication: "Skid frame / fabrication",
  pipingValvesAssembly: "Piping, valves and assembly",
  coolingHx: "Cooling heat exchanger",
};

export function configPrices() {
  const costs = designConfig.costs;
  return [
    ...Object.entries(costs.tanks).map(([size, unitCost]) => ({
      key: `tank:${size}`,
      label: `Balancing tank, ${size} kL`,
      estimate: unitCost,
    })),
    ...Object.entries(costs.pumps).map(([flow, unitCost]) => ({
      key: `pump:${flow}`,
      label: `Feed / discharge pump, ${flow} kL/h`,
      estimate: unitCost,
    })),
    ...Object.entries(LABELS).map(([key, label]) => ({
      key,
      label,
      estimate: costs[key],
    })),
  ];
}

export class PriceLibrary {
  constructor(dir) {
    this.path = dir === ":memory:" ? null : join(dir, FILE);
    this.memory = {};
    if (this.path) mkdirSync(dir, { recursive: true });
  }

  #read() {
    if (!this.path) return this.memory;
    return existsSync(this.path)
      ? JSON.parse(readFileSync(this.path, "utf8"))
      : {};
  }

  #write(saved) {
    if (!this.path) this.memory = saved;
    else atomicWriteFile(this.path, JSON.stringify(saved, null, 2));
  }

  list() {
    const saved = this.#read();
    return configPrices().map((price) => ({
      ...price,
      unitCost: saved[price.key]?.unitCost ?? price.estimate,
      status: saved[price.key]?.status ?? "estimate",
      quoteRef: saved[price.key]?.quoteRef ?? "",
      updatedAt: saved[price.key]?.updatedAt ?? null,
    }));
  }

  book() {
    return Object.fromEntries(this.list().map((price) => [price.key, price]));
  }

  set(key, { unitCost, status, quoteRef }) {
    if (!configPrices().some((price) => price.key === key)) return null;
    const saved = this.#read();
    saved[key] = {
      unitCost,
      status,
      quoteRef,
      updatedAt: new Date().toISOString(),
    };
    this.#write(saved);
    return this.book()[key];
  }

  reset(key) {
    if (!configPrices().some((price) => price.key === key)) return null;
    const { [key]: _removed, ...saved } = this.#read();
    this.#write(saved);
    return this.book()[key];
  }
}
