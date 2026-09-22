import { Link } from "react-router-dom";

const statuses = {
  "Within Limit": { label: "Within limit", tone: "within" },
  "Outside Limit": { label: "Outside limit", tone: "outside" },
  "Potentially Outside Limit": {
    label: "Potentially outside limit",
    tone: "unknown",
  },
  "Conditional / Engineering Review Required": {
    label: "Engineering review required",
    tone: "unknown",
  },
  "Treatment Required": { label: "Treatment required", tone: "outside" },
};

export default function TradeWastePanel({ results, reportTo }) {
  const selected = ["inletPH", "temperature", "tds", "bod"]
    .map((key) => results.find((result) => result.key === key))
    .filter(Boolean);
  return (
    <section className="card compact-panel">
      <h2>Wastewater checks</h2>
      <dl className="wastewater-checks">
        {selected.map((result) => {
          const status = statuses[result.status] ?? {
            label: "Regenerate design for updated screening",
            tone: "unknown",
          };
          return (
            <div key={result.key}>
              <dt>{result.parameter}</dt>
              <dd>
                <span className={`status ${status.tone}`}>{status.label}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      <Link className="small" to={reportTo}>
        More details available in report
      </Link>
    </section>
  );
}
