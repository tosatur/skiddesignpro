export default function EquipmentPanel({ equipment, children }) {
  return (
    <section
      className="card design-table-card equipment-panel"
      aria-labelledby="proposed-equipment-title"
    >
      <div className="design-panel-heading">
        <h2 id="proposed-equipment-title">Proposed equipment</h2>
        <span className="muted small">
          {equipment.items.length} equipment types
        </span>
      </div>
      {children}
      {equipment.items.length === 0 ? (
        <p className="panel-empty-state">
          No equipment selected for this design.
        </p>
      ) : (
        <div className="table-scroll design-table-scroll">
          <table className="equipment-table">
            <thead>
              <tr>
                <th scope="col">Equipment</th>
                <th scope="col" className="quantity">
                  Qty
                </th>
                <th scope="col">Size / details</th>
              </tr>
            </thead>
            <tbody>
              {equipment.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="quantity">
                    {item.quantity ?? "Not selected"}
                  </td>
                  <td className="muted">{item.details || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
