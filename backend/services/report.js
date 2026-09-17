import { designDisplay } from "./designDisplay.js";

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
          table(
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
              ["Control method", display.dosing.control],
              ...(g.dosing.chemical
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
        tables: [
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
        notes: [
          "Preliminary I/O: instruments and agitators are per tank; feed, discharge and selected dosing pumps are shared.",
        ],
      },
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
          "Preliminary component budget estimates only; not vendor quotations.",
        ],
        tables: [
          table(
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
              [
                "Preliminary estimated cost range",
                g.cost.complete
                  ? `${money(g.cost.low, g.cost.currency)}–${money(g.cost.high, g.cost.currency)} ${g.cost.currency}`
                  : "Equipment selection incomplete",
              ],
              ["Budget allowance", `±${Math.round(g.cost.uncertainty * 100)}%`],
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
