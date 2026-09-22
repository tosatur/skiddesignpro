import { money, footprint } from "../services/format.js";
import SpaceStatus from "./SpaceStatus.jsx";

export default function CostPanel({ cost, layout, spaceCheck }) {
  return (
    <section className="card compact-panel">
      <h2>Estimate & dimensions</h2>
      <dl className="value-list">
        <div>
          <dt>Estimated cost range</dt>
          <dd>
            {cost.complete
              ? `${money(cost.low, cost.currency)}–${money(cost.high, cost.currency)} ${cost.currency}`
              : "Equipment selection incomplete"}
          </dd>
        </div>
        <div>
          <dt>Approx. footprint (L × W)</dt>
          <dd>{footprint(layout.dimensions)}</dd>
        </div>
        <div>
          <dt>Available footprint (L × W)</dt>
          <dd>{footprint(spaceCheck.maximum)}</dd>
        </div>
      </dl>
      <SpaceStatus check={spaceCheck} />
    </section>
  );
}
