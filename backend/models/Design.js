import { randomUUID } from "node:crypto";
import { designConfig } from "../config/designConfig.js";
import { WastewaterProfile } from "./WastewaterProfile.js";
import { validateInputs } from "../services/validation.js";
import {
  selectChemical,
  selectEquipment,
  generateIOList,
} from "../services/equipmentSelection.js";
import { checkTradeWaste } from "../services/complianceCheck.js";
import { generateLayout } from "../services/layout.js";
import { estimateCost } from "../services/costing.js";

export function generateOutputs(inputs) {
  const profile = new WastewaterProfile(inputs);
  const dosing = selectChemical(inputs);
  const equipment = selectEquipment(inputs, dosing);
  return {
    profile,
    equipment,
    dosing,
    compliance: checkTradeWaste(inputs, profile),
    layout: generateLayout(inputs, equipment),
    ioList: generateIOList(equipment),
    cost: estimateCost(equipment),
    note: designConfig.reportNote,
  };
}

export class Design {
  constructor(rawInputs, previous = null, { inputsOnly = false } = {}) {
    const inputs = validateInputs(rawInputs);
    const now = new Date().toISOString();
    this.schemaVersion = designConfig.version;
    this.id = previous?.id ?? randomUUID();
    this.designName = inputs.designName;
    this.clientName = inputs.clientName;
    this.createdAt = previous?.createdAt ?? now;
    this.updatedAt = now;
    this.revision = (previous?.revision ?? 0) + 1;
    this.inputs = inputs;
    if (!inputsOnly) this.generated = generateOutputs(inputs);
  }
}
