// Stable IDs match equipment selection, costing, tags and layout items.
export const equipmentOptions = [
  {
    id: "tank",
    name: "Balancing tank",
    group: "Process equipment",
    description: "Tank quantity and volume selected from the design flow.",
  },
  {
    id: "feedPump",
    name: "Feed pump",
    group: "Process equipment",
    description: "Incoming wastewater pump and flow sizing.",
  },
  {
    id: "dischargePump",
    name: "Discharge pump",
    group: "Process equipment",
    description: "Treated wastewater pump and flow sizing.",
  },
  {
    id: "agitator",
    name: "Agitator",
    group: "Process equipment",
    description: "Mixing equipment for each selected balancing tank.",
    requiresTank: true,
  },
  {
    id: "coolingHx",
    name: "Cooling heat exchanger",
    group: "Process equipment",
    description: "Included when the inlet temperature requires cooling.",
  },
  {
    id: "phProbe",
    name: "pH measurement",
    group: "Instrumentation and controls",
    description: "pH feedback for each selected balancing tank.",
    requiresTank: true,
  },
  {
    id: "levelProbe",
    name: "Level transmitter",
    group: "Instrumentation and controls",
    description: "Continuous level measurement for each selected tank.",
    requiresTank: true,
  },
  {
    id: "lowLevelSwitch",
    name: "Low-level switch",
    group: "Instrumentation and controls",
    description: "Low-level detection for each selected tank.",
    requiresTank: true,
  },
  {
    id: "highLevelSwitch",
    name: "High-level switch",
    group: "Instrumentation and controls",
    description: "High-level detection for each selected tank.",
    requiresTank: true,
  },
  {
    id: "dosingController",
    name: "Dosing controller",
    group: "Instrumentation and controls",
    description: "pH control of the chemical dosing trains.",
  },
  {
    id: "skidController",
    name: "Skid controller / HMI",
    group: "Instrumentation and controls",
    description: "Pump, level and skid sequence control.",
  },
  {
    id: "causticDosingPump",
    name: "Caustic dosing pump",
    group: "Chemical dosing",
    description: "Caustic dosing train for raising pH.",
  },
  {
    id: "acidDosingPump",
    name: "Acid dosing pump",
    group: "Chemical dosing",
    description: "Acid dosing train for lowering pH.",
  },
  {
    id: "manualValve",
    name: "Manual isolation valve",
    group: "Valves and pipework",
    description: "Isolation valves for each enabled dosing train.",
    requiresDosing: true,
  },
  {
    id: "nonReturnValve",
    name: "Non-return valve",
    group: "Valves and pipework",
    description: "Backflow prevention for each enabled dosing train.",
    requiresDosing: true,
  },
  {
    id: "pressureReliefValve",
    name: "Pressure relief valve",
    group: "Valves and pipework",
    description: "Pressure relief for each enabled dosing train.",
    requiresDosing: true,
  },
  {
    id: "actuatedValve",
    name: "Actuated valve",
    group: "Valves and pipework",
    description: "Discharge and recirculation diversion valves.",
  },
  {
    id: "overflow",
    name: "Tank overflow",
    group: "Valves and pipework",
    description: "Overflow connections when more than one tank is selected.",
    requiresTank: true,
  },
  {
    id: "recirculation",
    name: "Recirculation line",
    group: "Valves and pipework",
    description: "Return line from discharge to the buffer tank.",
    requiresTank: true,
  },
];

export const normalizeEquipmentEnabled = (saved = {}) =>
  Object.fromEntries(
    equipmentOptions.map(({ id }) => [id, saved?.[id] !== false]),
  );
