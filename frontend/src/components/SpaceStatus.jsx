import { dimension } from "../services/format.js";

export default function SpaceStatus({ check }) {
  return (
    <div className={`space-status ${check.tone}`} role="status">
      <strong>{check.status}</strong>
      {check.orientationNote && <p>{check.orientationNote}</p>}
      {check.axes
        .filter((axis) => axis.overBy > 0)
        .map((axis) => (
          <dl className="space-measurements" key={axis.key}>
            <div>
              <dt>Calculated {axis.key}</dt>
              <dd>{dimension(axis.calculated)}</dd>
            </div>
            <div>
              <dt>Available {axis.key}</dt>
              <dd>{dimension(axis.maximum)}</dd>
            </div>
            <div>
              <dt>Over by</dt>
              <dd>{dimension(axis.overBy)}</dd>
            </div>
          </dl>
        ))}
    </div>
  );
}
