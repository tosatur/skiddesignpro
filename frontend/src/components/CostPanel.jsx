import { money, footprint } from "../services/format.js";
import SpaceStatus from "./SpaceStatus.jsx";

export default function CostPanel({ cost, layout, spaceCheck }) {
  return (
    <section className="card compact-panel">
      <h2>Dimensions</h2>
      <dl className="value-list">
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
