export default function ReportTable({ table, compliance }) {
  return (
    <div className="table-scroll">
      <table className={compliance ? "compliance-table" : undefined}>
        <thead>
          <tr>
            {table.columns.map((column, i) => (
              <th key={i}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>
                  {compliance && j === 2 ? (
                    <span
                      className={
                        "status " +
                        (cell === "Within Limit"
                          ? "within"
                          : ["Outside Limit", "Treatment Required"].includes(
                                cell,
                              )
                            ? "outside"
                            : "unknown")
                      }
                    >
                      {cell}
                    </span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
