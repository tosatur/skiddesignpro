import { date } from "../services/format.js";

export default function RecentDesignsTable({ files, onOpen, onRemove }) {
  return (
    <div className="table-scroll">
      <table className="saved-table">
        <thead>
          <tr>
            <th>Design name</th>
            <th>Client / Facility</th>
            <th>Last modified</th>
            <th>Location</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr
              key={file.path}
              tabIndex={0}
              aria-label={`Open ${file.designName}`}
              onClick={(event) => {
                if (!event.target.closest("button")) onOpen(file);
              }}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  ["Enter", " "].includes(event.key)
                ) {
                  event.preventDefault();
                  onOpen(file);
                }
              }}
            >
              <td>
                <span className="design-link">{file.designName}</span>
              </td>
              <td>{file.clientName}</td>
              <td className="muted">{date(file.updatedAt)}</td>
              <td className="muted small">{file.path}</td>
              <td>
                <button
                  type="button"
                  className="text-button small"
                  aria-label={`Remove ${file.designName} from Recent files`}
                  onClick={() => onRemove(file)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
