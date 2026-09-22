export default function EquipmentPanel({ equipment }) {
  return (
    <section className="card equipment-panel">
      <h2>Proposed equipment</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Equipment</th>
              <th>Quantity</th>
              <th>Size / Details</th>
            </tr>
          </thead>
          <tbody>
            {equipment.items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.quantity ?? "Not selected"}</td>
                <td>{item.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
