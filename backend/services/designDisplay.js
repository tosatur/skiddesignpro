import { equipmentDetails } from "./equipmentSelection.js";
import { availableSpace, checkSpace } from "./layout.js";

// Presentation for current and older snapshots. Never reselect equipment, redraw
// a saved layout, read current configuration, or write back to the database.
export function designDisplay({ inputs, generated: g }) {
  return {
    equipment: {
      ...g.equipment,
      items: g.equipment.items.map((item) => ({
        ...item,
        details: equipmentDetails(item, g.equipment, g.dosing),
      })),
    },
    dosing: {
      ...g.dosing,
      control:
        g.dosing.control ??
        (g.dosing.chemical ? "pH feedback" : "pH monitoring"),
    },
    // Correct earlier custom-space caps using saved inputs, without regenerating
    // geometry. Default-mode snapshots retain their saved default allowance.
    spaceCheck: checkSpace(
      g.layout.dimensions,
      availableSpace(inputs.spaceConstraint, g.layout.maximum),
    ),
  };
}
