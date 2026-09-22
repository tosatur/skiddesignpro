import { useRef, useState } from "react";
import { designService } from "../services/designService.js";
import { downloadAllReportsText } from "../services/reportService.js";

export default function TestTools({ onImported, onDeleted, hasDesigns }) {
  const deleteDialog = useRef(null);
  const [deleteError, setDeleteError] = useState("");
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function importDesigns(event) {
    event.preventDefault();
    setError("");
    setSummary(null);
    let inputs;
    try {
      inputs = JSON.parse(json);
    } catch {
      setError("Enter valid JSON containing an array of design inputs.");
      return;
    }
    setBusy(true);
    try {
      const result = await designService.import(inputs);
      setSummary(result);
      if (result.imported) onImported();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function exportText() {
    setBusy(true);
    setError("");
    try {
      await downloadAllReportsText();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAllDesigns() {
    setBusy(true);
    setDeleteError("");
    try {
      await designService.deleteAll();
      setSummary(null);
      setError("");
      deleteDialog.current.close();
      onDeleted();
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="test-tools" aria-label="Test tools">
      <div className="actions">
        <button
          className="button"
          aria-expanded={open}
          aria-controls="test-import"
          onClick={() => setOpen(!open)}
          disabled={busy}
        >
          Import test designs
        </button>
        <button
          className="button"
          onClick={exportText}
          disabled={busy || !hasDesigns}
        >
          Export All Reports as Text
        </button>
        <button
          type="button"
          className="button danger"
          onClick={() => {
            setDeleteError("");
            deleteDialog.current.showModal();
          }}
          disabled={busy || !hasDesigns}
        >
          Delete All Previous Designs
        </button>
      </div>
      <dialog
        ref={deleteDialog}
        className="confirm-dialog"
        aria-labelledby="delete-all-designs-title"
        aria-describedby="delete-all-designs-note"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2 id="delete-all-designs-title">Delete all previous designs?</h2>
        <p id="delete-all-designs-note">
          This will permanently delete every saved design, including manually
          created and imported designs. This action cannot be undone.
        </p>
        {deleteError && (
          <div className="notice error" role="alert">
            {deleteError}
          </div>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            onClick={() => deleteDialog.current.close()}
            disabled={busy}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            className="button danger"
            onClick={deleteAllDesigns}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete All Previous Designs"}
          </button>
        </div>
      </dialog>
      {open && (
        <form
          id="test-import"
          className="card form-card"
          onSubmit={importDesigns}
        >
          <h2>Import test designs</h2>
          <p className="muted small">
            Paste a JSON array of design inputs. Duplicate names are skipped.
            Generated results are ignored.
          </p>
          <p className="muted small" id="test-json-space-help">
            For custom available space, include{" "}
            <code>
              {
                '"spaceConstraint": { "type": "custom", "length": 15, "width": 10 }'
              }
            </code>{" "}
            in the design. Length and width are in metres.
          </p>
          <div className="field">
            <label htmlFor="test-json">Design inputs (JSON)</label>
            <textarea
              id="test-json"
              aria-describedby="test-json-space-help"
              rows={10}
              value={json}
              onChange={(e) => setJson(e.target.value)}
              disabled={busy}
              spellCheck={false}
            />
          </div>
          <div className="form-actions">
            <button className="button" type="submit" disabled={busy}>
              {busy ? "Working…" : "Import designs"}
            </button>
          </div>
        </form>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {summary && (
        <div className="import-summary" role="status">
          <p>
            {summary.supplied} designs supplied · {summary.imported} imported ·{" "}
            {summary.rejected.length} rejected · {summary.skipped.length}{" "}
            skipped
          </p>
          {[
            ["Rejected", summary.rejected],
            ["Skipped", summary.skipped],
          ].map(
            ([label, entries]) =>
              entries.length > 0 && (
                <div key={label}>
                  <strong>{label}</strong>
                  <ul>
                    {entries.map((entry, index) => (
                      <li key={index}>
                        {entry.designName}: {entry.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
          )}
        </div>
      )}
    </section>
  );
}
