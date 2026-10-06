import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeEquipmentEnabled } from "../config/equipmentOptions.js";
import { atomicWriteFile } from "../util/atomicWrite.js";

export class AppSettings {
  constructor(dir = ":memory:") {
    this.path = dir === ":memory:" ? null : join(dir, "settings.json");
    this.memory = {};
    if (this.path) mkdirSync(dir, { recursive: true });
  }

  get() {
    const saved = this.path
      ? existsSync(this.path)
        ? JSON.parse(readFileSync(this.path, "utf8"))
        : {}
      : this.memory;
    return {
      equipmentEnabled: normalizeEquipmentEnabled(saved.equipmentEnabled),
    };
  }

  updateEquipment(changes) {
    const saved = this.get();
    saved.equipmentEnabled = normalizeEquipmentEnabled({
      ...saved.equipmentEnabled,
      ...changes,
    });
    if (this.path) atomicWriteFile(this.path, JSON.stringify(saved, null, 2));
    else this.memory = saved;
    return saved;
  }
}
