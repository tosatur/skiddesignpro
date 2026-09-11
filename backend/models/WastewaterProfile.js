import { designConfig } from "../config/designConfig.js";
import {
  parseMeasurement,
  formatMeasurement,
} from "../../shared/measurements.js";

export class WastewaterProfile {
  constructor(inputs) {
    this.name =
      inputs.wastewaterProfile === "typical"
        ? "Typical Dairy Wastewater"
        : "Custom Wastewater";
    this.parameters = designConfig.wastewater.map((parameter) => {
      const value =
        inputs.wastewaterProfile === "typical"
          ? {
              low: parameter.min,
              high: parameter.max,
              highExclusive: Boolean(parameter.upperExclusive),
            }
          : parseMeasurement(inputs.customWastewaterData[parameter.key]);
      return {
        key: parameter.key,
        label: parameter.label,
        unit: parameter.unit,
        value,
        display: formatMeasurement(value),
      };
    });
  }
}
