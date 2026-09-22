import { date, number } from "../services/format.js";

export default function DesignSummaryPanel({ design }) {
  const { inputs, generated } = design;
  const fields = [
    ["Flow rate", `${number(inputs.flowRate)} kL/h`],
    ["Daily volume", `${number(inputs.dailyVolume)} kL/day`],
    ["Inlet pH", inputs.inletPH],
    ["Target pH", inputs.targetPH],
    ["Temperature", `${inputs.temperature} °C`],
    ["Wastewater Profile", generated.profile.name],
    ["Last modified", date(design.updatedAt)],
  ];
  return (
    <section className="card summary-panel">
      <h2>Design inputs</h2>
      <dl className="summary-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
