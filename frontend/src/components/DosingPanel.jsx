export default function DosingPanel({ dosing }) {
  return (
    <section className="card compact-panel">
      <h2>Chemical dosing</h2>
      <dl className="value-list">
        <div>
          <dt>pH correction</dt>
          <dd>{dosing.correction}</dd>
        </div>
        <div>
          <dt>Chemical</dt>
          <dd>{dosing.chemical?.name ?? "None required"}</dd>
        </div>
        <div>
          <dt>Control</dt>
          <dd>{dosing.control}</dd>
        </div>
      </dl>
    </section>
  );
}
