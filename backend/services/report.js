import { designDisplay } from "./designDisplay.js";
import { summariseIO } from "./equipmentSelection.js";

const unavailable = "Not selected";
const number = (value) =>
  value.toLocaleString("en-AU", { maximumFractionDigits: 2 });
const money = (value, currency) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
const table = (columns, rows, weights) => ({ columns, rows, weights });
const dimension = (value) =>
  value == null
    ? "Unavailable"
    : `${value.toLocaleString("en-AU", { maximumFractionDigits: 6 })} m`;

export function buildReport(design, display = designDisplay(design)) {
  const { inputs, generated: g } = design;
  const maximum = display.spaceCheck.maximum;
  // PDF, text export and on-screen preview all render this shared result.
  // Inconsistent flow/volume inputs warn without changing design calculations.
  const maximumDailyVolume = inputs.flowRate * 24;
  const flowVolumeNotes =
    inputs.dailyVolume > maximumDailyVolume
      ? [
          "Flow/volume warning: Daily wastewater volume exceeds the maximum volume that can be processed at the entered design flow over 24 hours.",
          `Maximum at ${number(inputs.flowRate)} kL/h over 24 hours: ${number(maximumDailyVolume)} kL/day.`,
        ]
      : [];
  // Older snapshots remain immutable. Omit their obsolete no-result rows and
  // tell the engineer to regenerate to apply the revised calculation rules.
  const compliance = g.compliance.filter(
    (row) =>
      !["targetPH", "tn", "totalNitrogen", "ammonia", "outlet"].includes(
        row.key,
      ) && row.status !== "Insufficient Data",
  );
  const inletPH = g.compliance.find((row) => row.key === "inletPH");
  const targetPH = g.compliance.find((row) => row.key === "targetPH");
  const parameters = g.profile.parameters.filter(
    (p) => p.value && !["tn", "totalNitrogen"].includes(p.key),
  );
  const tagged = display.equipment.items.some((e) => e.tags?.length);
  const typedIO = g.ioList.some((io) => io.type);
  const costBasis = g.cost.lines.some((line) => line.basis);
  const basisLabel = (line) => {
    const label =
      line.basis === "quoted"
        ? "Quote"
        : line.basis === "library"
          ? "Library quote"
          : "Estimate";
    return line.quoteRef ? `${label} (${line.quoteRef})` : label;
  };
  const costValue = (value) =>
    value == null ? "To be confirmed" : money(value, g.cost.currency);
  const subtotal = g.cost.complete
    ? (g.cost.subtotal ??
      g.cost.lines.reduce((sum, line) => sum + line.amount, 0))
    : null;
  const footprintStatus =
    display.spaceCheck.tone === "outside"
      ? "NOT MET"
      : display.spaceCheck.tone === "within"
        ? "MET"
        : "NOT ASSESSED";
  return {
    title: design.designName,
    subtitle: "pH Correction Skid Design",
    client: design.clientName,
    revision: design.revision,
    sections: [
      {
        title: "Project Summary",
        tables: [
          table(
            ["Project", "Value"],
            [
              ["Client / Facility", design.clientName],
              [
                "Last modified",
                new Date(design.updatedAt).toLocaleString("en-AU", {
                  timeZone: "Australia/Sydney",
                }),
              ],
              ["Wastewater Profile", g.profile.name],
            ],
          ),
        ],
      },
      {
        title: "Design Inputs",
        tables: [
          table(
            ["Input", "Value", "Input", "Value"],
            [
              [
                "Flow rate",
                `${number(inputs.flowRate)} kL/h`,
                "Daily volume",
                `${number(inputs.dailyVolume)} kL/day`,
              ],
              [
                "Inlet pH",
                String(inputs.inletPH),
                "Target pH",
                String(inputs.targetPH),
              ],
              [
                "Temperature",
                `${inputs.temperature} °C`,
                "Available footprint (L × W)",
                `${maximum.length} × ${maximum.width} m`,
              ],
            ],
          ),
          ...(parameters.length
            ? [
                table(
                  ["Wastewater parameter", "Value"],
                  parameters.map((p) => [p.label, `${p.display} ${p.unit}`]),
                ),
              ]
            : []),
        ],
        notes: flowVolumeNotes,
      },
      {
        title: "Proposed Equipment",
        tables: [
          tagged
            ? table(
                ["Equipment", "Tags", "Quantity", "Size / Details"],
                display.equipment.items.map((e) => [
                  e.name,
                  e.tags?.join(", ") || "-",
                  e.quantity ?? unavailable,
                  e.details,
                ]),
                [0.27, 0.3, 0.11, 0.32],
              )
            : table(
                ["Equipment", "Quantity", "Size / Details"],
                display.equipment.items.map((e) => [
                  e.name,
                  e.quantity ?? unavailable,
                  e.details,
                ]),
                [0.45, 0.18, 0.37],
              ),
        ],
        notes: g.equipment.sizing
          ? [g.equipment.sizing.tank, g.equipment.sizing.pump]
          : [],
      },
      {
        title: "Chemical Dosing",
        tables: [
          table(
            ["Item", "Selection"],
            [
              [
                "Regulatory pH status (inlet)",
                `${inletPH.status} (pH ${inputs.inletPH}; acceptance range ${inletPH.criterion})`,
              ],
              [
                "Selected target pH",
                inputs.targetPH.toLocaleString("en-AU", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                }),
              ],
              [
                "Control action",
                `${g.dosing.correction}${g.dosing.chemical ? " to selected operating target" : " at selected operating target"}`,
              ],
              ["Chemical", display.dosing.chemical?.name ?? "None required"],
              ...(g.dosing.trains?.length
                ? [
                    [
                      "Dosing trains fitted",
                      g.dosing.trains.map((c) => c.name).join("; "),
                    ],
                  ]
                : []),
              ["Control method", display.dosing.control],
              ...(g.dosing.trains?.length
                ? [
                    [
                      "Control strategy",
                      "pH probes feed the dosing controller, which trims the caustic or acid dose rate in proportion to the deviation from the target pH, tapering as the target is approached.",
                    ],
                    [
                      "Chemical demand",
                      "Not calculated: wastewater composition and buffering vary, so the dose is set in real time by the controller. Confirm reagent consumption by titration and commissioning.",
                    ],
                    [
                      "Dosing pump capacity",
                      "To be confirmed against tank volume, titration and commissioning results.",
                    ],
                  ]
                : g.dosing.chemical
                  ? [
                      [
                        "Chemical demand",
                        "To be confirmed by wastewater titration / commissioning testing.",
                      ],
                      [
                        "Dosing pump capacity",
                        "To be confirmed following chemical demand testing.",
                      ],
                    ]
                  : []),
              ...(targetPH?.status === "Outside Limit"
                ? [
                    [
                      "Target warning",
                      "Selected operating target is outside the supplied pH acceptance range.",
                    ],
                  ]
                : []),
            ],
            [0.35, 0.65],
          ),
        ],
      },
      {
        title: "Trade Waste Check",
        tables: [
          table(
            ["Parameter / value", "Criterion", "Status"],
            compliance.map((r) => [
              `${r.parameter}${["inletPH", "temperature"].includes(r.key) ? ": " : "\n"}${r.value}`,
              r.criterion,
              r.status,
            ]),
            [0.37, 0.35, 0.28],
          ),
        ],
        compliance: true,
        notes: [
          ...new Set(
            compliance.flatMap((row) =>
              [row.warning, row.basis, row.explanation].filter(Boolean),
            ),
          ),
        ],
      },
      {
        title: "Electrical I/O",
        tables: typedIO
          ? [
              table(
                ["Tag", "Equipment", "Signal", "Type", "Controller"],
                g.ioList.map((io) => [
                  io.tag ?? unavailable,
                  io.name,
                  io.signal,
                  io.type,
                  io.controller,
                ]),
                [0.18, 0.26, 0.28, 0.1, 0.18],
              ),
              table(
                ["Controller", "AI", "AO", "DI", "DO", "Total"],
                summariseIO(g.ioList, display.equipment.items).map((row) => [
                  row.controller,
                  row.AI,
                  row.AO,
                  row.DI,
                  row.DO,
                  row.total,
                ]),
                [0.4, 0.12, 0.12, 0.12, 0.12, 0.12],
              ),
            ]
          : [
              table(
                ["Direction", "Equipment", "Quantity"],
                g.ioList.map((io) => [
                  io.direction,
                  io.name,
                  io.quantity ?? unavailable,
                ]),
                [0.2, 0.6, 0.2],
              ),
            ],
        notes: typedIO
          ? [
              "Preliminary hardwired I/O; spare capacity not included. A fieldbus (e.g. Modbus or AS-i) may replace discrete wiring at detailed design.",
              ...(g.ioList.some((io) => !io.tag)
                ? [
                    "Signal counts exclude equipment not yet selected; complete the equipment selection for a full I/O count.",
                  ]
                : []),
            ]
          : [
              "Preliminary I/O: instruments and agitators are per tank; feed, discharge and dosing pumps are shared.",
            ],
      },
      ...(g.process
        ? [
            {
              title: "Process Calculations",
              tables: [
                table(
                  [
                    "Line",
                    "Flow",
                    "Required bore",
                    "Selected size",
                    "Velocity",
                  ],
                  g.process.pipes.length
                    ? g.process.pipes.map((pipe) => [
                        pipe.line,
                        `${number(pipe.flowKLH)} kL/h`,
                        `${number(pipe.requiredIdMm)} mm`,
                        pipe.dn
                          ? `DN${pipe.dn} (${pipe.idMm} mm bore)`
                          : unavailable,
                        pipe.velocity == null
                          ? "-"
                          : `${number(pipe.velocity)} m/s`,
                      ])
                    : [
                        [
                          "Process lines (feed / discharge)",
                          "-",
                          "-",
                          unavailable,
                          "-",
                        ],
                      ],
                  [0.28, 0.14, 0.16, 0.26, 0.16],
                ),
                ...(g.process.cooling
                  ? [
                      table(
                        ["Cooling", "Value"],
                        [
                          [
                            "Design flow",
                            `${number(g.process.cooling.flowKLH)} kL/h`,
                          ],
                          [
                            "Inlet / target temperature",
                            `${number(g.process.cooling.inletC)} °C / ${number(g.process.cooling.targetC)} °C`,
                          ],
                          [
                            "Cooling duty",
                            `${number(g.process.cooling.dutyKW)} kW`,
                          ],
                        ],
                        [0.4, 0.6],
                      ),
                    ]
                  : []),
              ],
              notes: [
                `Pipe sizing basis: pump rated flow at a maximum velocity of ${number(g.process.maxVelocity)} m/s, stainless steel Schedule 10S bores. Pump head and final line sizes to be confirmed during detailed engineering.`,
                ...(g.process.cooling
                  ? [
                      "Cooling duty basis: Q = ṁ × cp × ΔT at the design flow, with water properties (1,000 kg/m³, 4.18 kJ/kg·K). Exchanger type, cooling medium and approach temperature to be confirmed.",
                    ]
                  : []),
              ],
            },
          ]
        : []),
      {
        title: "2D Layout",
        layout: true,
        callout: {
          text: `Footprint Constraint: ${footprintStatus}${display.spaceCheck.tone === "within" && display.spaceCheck.rotation === 90 ? " (90° rotation)" : ""}`,
          tone: display.spaceCheck.tone,
        },
        tables: [
          table(
            [
              "Dimension",
              display.spaceCheck.rotation === 90
                ? "Required footprint (90° rotation)"
                : "Required preliminary layout",
              "Available footprint",
              "Excess",
            ],
            display.spaceCheck.axes.map((axis) => [
              axis.key[0].toUpperCase() + axis.key.slice(1),
              dimension(axis.calculated),
              dimension(axis.maximum),
              axis.overBy > 0
                ? `Excess ${axis.key}: ${dimension(axis.overBy)}`
                : axis.overBy === 0
                  ? "None"
                  : "To be confirmed",
            ]),
            [0.2, 0.25, 0.25, 0.3],
          ),
        ],
        notes: [
          ...(display.spaceCheck.tone === "outside"
            ? [
                "Layout reconfiguration required before proceeding: neither 0° nor 90° fits. Review alternate arrangement, tank geometry or split skid; their fit is unverified.",
              ]
            : display.spaceCheck.tone === "unknown"
              ? [
                  "Footprint cannot be assessed until missing equipment selections or dimensions are confirmed.",
                ]
              : []),
          ...(display.spaceCheck.orientationNote
            ? [display.spaceCheck.orientationNote]
            : []),
        ],
      },
      {
        title: "Approximate Cost",
        paragraphs: [
          costBasis
            ? "Preliminary budget. Quoted prices are used as given; the remaining lines are budget estimates, not vendor quotations."
            : "Preliminary component budget estimates only; not vendor quotations.",
        ],
        tables: [
          costBasis
            ? table(
                [
                  "Component",
                  "Qty",
                  `Unit cost (${g.cost.currency})`,
                  `Amount (${g.cost.currency})`,
                  "Basis",
                ],
                g.cost.lines.map((line) => [
                  line.name,
                  line.quantity ?? "-",
                  line.unitCost == null ? "-" : costValue(line.unitCost),
                  costValue(line.amount),
                  basisLabel(line),
                ]),
                [0.34, 0.09, 0.17, 0.17, 0.23],
              )
            : table(
                [
                  "Component",
                  "Quantity",
                  `Unit budget (${g.cost.currency})`,
                  `Estimate (${g.cost.currency})`,
                ],
                g.cost.lines.map((line) => [
                  line.name,
                  line.quantity ?? "-",
                  line.unitCost == null ? "-" : costValue(line.unitCost),
                  costValue(line.amount),
                ]),
                [0.46, 0.1, 0.22, 0.22],
              ),
          table(
            ["Estimate", "Value"],
            [
              ["Estimated equipment subtotal", costValue(subtotal)],
              ...(costBasis && g.cost.complete
                ? [
                    [
                      "Quoted portion",
                      `${costValue(g.cost.quoted)} (${Math.round(g.cost.quotedShare * 100)}%)`,
                    ],
                  ]
                : []),
              [
                "Preliminary estimated cost range",
                g.cost.complete
                  ? `${money(g.cost.low, g.cost.currency)}–${money(g.cost.high, g.cost.currency)} ${g.cost.currency}`
                  : "Equipment selection incomplete",
              ],
              [
                "Budget allowance",
                costBasis
                  ? `±${Math.round(g.cost.uncertainty * 100)}% on estimated lines; quoted lines fixed`
                  : `±${Math.round(g.cost.uncertainty * 100)}%`,
              ],
            ],
          ),
        ],
      },
      {
        title: "Notes",
        paragraphs: [
          g.note,
          ...(!g.equipment.sizing
            ? [
                "Regenerate this saved design to apply the updated screening, I/O and sizing bases.",
              ]
            : []),
        ],
      },
    ],
  };
}
