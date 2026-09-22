import { Link, useNavigate } from "react-router-dom";
import { number, date } from "../services/format.js";

export default function SavedDesignTable({ designs }) {
  const navigate = useNavigate();
  return (
    <div className="table-scroll">
      <table className="saved-table">
        <thead>
          <tr>
            <th>Design name</th>
            <th>Client / Facility</th>
            <th>Design flow rate</th>
            <th>Target pH</th>
            <th>Last modified</th>
          </tr>
        </thead>
        <tbody>
          {designs.map((d) => (
            <tr
              key={d.id}
              tabIndex={0}
              aria-label={`Open ${d.designName}`}
              onClick={(event) => {
                if (!event.target.closest("a, button"))
                  navigate(`/designs/${d.id}`);
              }}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  ["Enter", " "].includes(event.key)
                ) {
                  event.preventDefault();
                  navigate(`/designs/${d.id}`);
                }
              }}
            >
              <td>
                <Link
                  className="design-link"
                  to={`/designs/${d.id}`}
                  tabIndex={-1}
                >
                  {d.designName}
                </Link>
              </td>
              <td>{d.clientName}</td>
              <td>
                {number(d.inputs.flowRate)} <span className="muted">kL/h</span>
              </td>
              <td>{number(d.inputs.targetPH)}</td>
              <td className="muted">{date(d.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
