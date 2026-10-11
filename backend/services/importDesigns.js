import { Design } from "../models/Design.js";
import { exactSulphurTotal } from "../../shared/measurements.js";

// Importer labels only; normal form validation and saved field names stay intact.
function rejectionReason(error, inputs) {
  return Object.entries(error.fields)
    .map(([field, message]) => {
      if (field === "customWastewaterData.bod")
        field = "customWastewaterData.bod5";
      if (
        field === "spaceConstraint.length" &&
        typeof inputs?.spaceConstraint?.length === "number" &&
        inputs.spaceConstraint.length <= 0
      )
        message = "Available-space length must be greater than 0.";
      if (field === "spaceConstraint" && inputs?.spaceConstraint === undefined)
        message = "Provide spaceConstraint with type 'container' or 'custom'.";
      if (field === "wastewaterProfile")
        message = "Wastewater profile must be 'typical' or 'custom'.";
      return `${field}: ${message}`;
    })
    .join("; ");
}

export function importDesigns(
  store,
  inputs,
  { equipmentEnabled, onImported } = {},
) {
  const names = new Set(
    store.list().map((d) => d.designName.trim().toLowerCase()),
  );
  const summary = {
    supplied: inputs.length,
    imported: 0,
    rejected: [],
    skipped: [],
    failed: [],
    warnings: [],
  };
  for (const [index, raw] of inputs.entries()) {
    const entry = {
      index: index + 1,
      designName:
        typeof raw?.designName === "string" && raw.designName.trim()
          ? raw.designName.trim()
          : `Entry ${index + 1}`,
    };
    let design;
    try {
      design = new Design(raw, null, { inputsOnly: true, equipmentEnabled });
    } catch (error) {
      if (error.status !== 400) throw error;
      summary.rejected.push({ ...entry, reason: rejectionReason(error, raw) });
      continue;
    }
    const name = design.designName.toLowerCase();
    if (names.has(name)) {
      summary.skipped.push({
        ...entry,
        reason: "A design with this name already exists.",
      });
      continue;
    }
    if (exactSulphurTotal(design.inputs.customWastewaterData) !== null)
      design.inputs.customWastewaterData.sulphur = "";
    try {
      store.create(design);
    } catch (error) {
      summary.failed.push({
        ...entry,
        reason: `Could not save this design. ${error.message || "Please try again."}`,
      });
      continue;
    }
    names.add(name);
    summary.imported++;
    try {
      onImported?.(design);
    } catch {
      summary.warnings.push({
        ...entry,
        reason:
          "The design was saved, but its Recents entry could not be updated. Open it from the save folder.",
      });
    }
  }
  return summary;
}
