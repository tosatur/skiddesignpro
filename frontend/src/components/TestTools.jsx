import { useEffect, useRef, useState } from "react";
import { designService } from "../services/designService.js";
import { downloadAllReportsText } from "../services/reportService.js";

const example = `[
  {
    "designName": "Example skid", "clientName": "Example facility",
    "flowRate": 10, "dailyVolume": 80,
    "inletPH": 6.5, "targetPH": 7, "temperature": 25,
    "wastewaterProfile": "typical",
    "spaceConstraint": { "type": "container" }
  }
]`;

function importHeading(summary) {
  if (!summary.imported)
    return summary.failed.length ? "Import failed" : "No designs imported";
  return summary.rejected.length ||
    summary.skipped.length ||
    summary.failed.length ||
    summary.warnings.length
    ? "Import completed with issues"
    : "Import complete";
}

export default function TestTools({ onImported }) {
  const dialog = useRef(null);
  const launcher = useRef(null);
  const textarea = useRef(null);
  const heading = useRef(null);
  const working = useRef(false);
  const loadRequest = useRef(0);
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("");
  const [inputError, setInputError] = useState("");
  const [exportCount, setExportCount] = useState(null);
  const [listError, setListError] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (open) (result ? heading : textarea).current?.focus();
  }, [open, result]);

  async function show() {
    if (dialog.current.open) return;
    setResult(null);
    setInputError("");
    setExportCount(null);
    setListError("");
    setOpen(true);
    dialog.current.showModal();
    const request = ++loadRequest.current;
    try {
      const designs = await designService.list();
      if (!dialog.current?.open || request !== loadRequest.current) return;
      setExportCount(designs.length);
    } catch {
      if (!dialog.current?.open || request !== loadRequest.current) return;
      setListError(
        "Could not check saved designs. Reopen the dialog to try again.",
      );
    }
  }

  function close() {
    if (!working.current) dialog.current.close();
  }

  function keepFocusInDialog(event) {
    if (event.key !== "Tab") return;
    const controls = [
      ...event.currentTarget.querySelectorAll(
        "button:not(:disabled), textarea:not(:disabled)",
      ),
    ].filter((control) => control.getClientRects().length);
    const first = controls[0],
      last = controls.at(-1);
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !controls.includes(active))) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  async function importDesigns(event) {
    event.preventDefault();
    if (working.current) return;
    if (!json.trim()) {
      setInputError("Enter design inputs before importing designs.");
      textarea.current?.focus();
      return;
    }
    let inputs;
    try {
      inputs = JSON.parse(json);
    } catch {
      setResult({
        title: "Import failed",
        message:
          "Enter valid JSON containing an array of design inputs. Nothing was saved.",
      });
      return;
    }
    if (!Array.isArray(inputs)) {
      setResult({
        title: "Import failed",
        message: "Supply a JSON array of design inputs. Nothing was saved.",
      });
      return;
    }
    if (inputs.length === 0) {
      setInputError(
        "Add at least one design to the JSON array before importing.",
      );
      textarea.current?.focus();
      return;
    }
    setInputError("");
    working.current = true;
    setBusy("import");
    try {
      const summary = await designService.import(inputs);
      if (summary.imported) onImported();
      setResult({ title: importHeading(summary), summary });
    } catch (error) {
      setResult({ title: "Import failed", message: error.message });
    } finally {
      working.current = false;
      setBusy("");
    }
  }

  async function exportText() {
    if (working.current) return;
    if (!json.trim()) {
      setInputError("Enter design inputs before exporting as text.");
      textarea.current?.focus();
      return;
    }
    if (!exportCount) {
      setResult({
        title: "Export failed",
        message: "No saved designs to export.",
      });
      return;
    }
    setInputError("");
    working.current = true;
    setBusy("export");
    try {
      const outcome = await downloadAllReportsText();
      if (outcome.status === "cancelled")
        setResult({
          title: "Export cancelled",
          message: "No report file was saved.",
        });
      else if (outcome.status === "saved")
        setResult({
          title: "Export complete",
          message: `${outcome.designCount} saved designs exported to ${outcome.path}.`,
        });
      else if (outcome.status === "started")
        setResult({
          title: "Download started",
          message: `Text reports for ${outcome.designCount} saved designs were sent to your browser. Check your browser downloads for the saved file.`,
        });
      else throw new Error("The export outcome could not be confirmed.");
    } catch (error) {
      setResult({ title: "Export failed", message: error.message });
    } finally {
      working.current = false;
      setBusy("");
    }
  }

  const exportNote =
    listError ||
    (exportCount === null
      ? "Checking saved designs…"
      : exportCount === 0
        ? "No saved designs to export."
        : `Exports all ${exportCount} saved designs in the configured save folder.`);

  return (
    <section className="test-tools" aria-label="Test tools">
      <div className="actions">
        <button
          ref={launcher}
          className="button"
          aria-haspopup="dialog"
          onClick={show}
        >
          Import test designs
        </button>
      </div>
      <dialog
        ref={dialog}
        className="confirm-dialog test-import-dialog"
        aria-labelledby="test-import-title"
        aria-busy={Boolean(busy)}
        onKeyDown={keepFocusInDialog}
        onCancel={(event) => {
          if (working.current) event.preventDefault();
        }}
        onClose={() => {
          setOpen(false);
          launcher.current?.focus();
        }}
      >
        <div className="test-import-heading">
          <h2 id="test-import-title" ref={heading} tabIndex={-1}>
            {result?.title ?? "Import test designs"}
          </h2>
          <button
            type="button"
            className="test-import-close"
            aria-label="Close dialog"
            onClick={close}
            disabled={Boolean(busy)}
          >
            ×
          </button>
        </div>
        {result ? (
          <div className="test-import-content test-import-results">
            {result.message && <p>{result.message}</p>}
            {result.summary && (
              <>
                <p className="test-import-counts">
                  {result.summary.supplied} supplied · {result.summary.imported}{" "}
                  imported · {result.summary.rejected.length} rejected ·{" "}
                  {result.summary.skipped.length} skipped
                  {result.summary.failed.length > 0 &&
                    ` · ${result.summary.failed.length} save failure${result.summary.failed.length === 1 ? "" : "s"}`}
                </p>
                {[
                  ["Rejected", result.summary.rejected],
                  ["Skipped", result.summary.skipped],
                  ["Save failures", result.summary.failed],
                  ["Warnings", result.summary.warnings],
                ].map(
                  ([label, entries]) =>
                    entries.length > 0 && (
                      <section key={label}>
                        <h3>{label}</h3>
                        <ul>
                          {entries.map((entry, index) => (
                            <li key={index}>
                              <strong>
                                {entry.index}. {entry.designName}
                              </strong>
                              : {entry.reason}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ),
                )}
              </>
            )}
          </div>
        ) : (
          <form
            id="test-import-form"
            className="test-import-content"
            onSubmit={importDesigns}
          >
            <div className="field">
              <label htmlFor="test-json">Design inputs (JSON)</label>
              <p className="muted small" id="test-json-help">
                Enter a JSON array of design inputs. Duplicate names are
                skipped.
              </p>
              <textarea
                id="test-json"
                ref={textarea}
                aria-describedby={`test-json-help${inputError ? " test-json-error" : ""}`}
                aria-invalid={Boolean(inputError)}
                rows={10}
                value={json}
                placeholder={example}
                onChange={(event) => {
                  setJson(event.target.value);
                  setInputError("");
                }}
                disabled={Boolean(busy)}
                spellCheck={false}
              />
              {inputError && (
                <p id="test-json-error" className="notice error" role="alert">
                  {inputError}
                </p>
              )}
            </div>
          </form>
        )}
        <div className="test-import-footer">
          {result ? (
            <button type="button" className="button" onClick={close}>
              Close
            </button>
          ) : (
            <>
              <p id="test-export-note" className="muted small">
                {exportNote}
              </p>
              <div className="actions">
                <button
                  type="submit"
                  form="test-import-form"
                  className="button primary"
                  disabled={Boolean(busy)}
                >
                  {busy === "import" ? "Importing…" : "Import Designs"}
                </button>
                <button
                  type="button"
                  className="button"
                  aria-describedby="test-export-note"
                  onClick={exportText}
                  disabled={Boolean(busy) || exportCount === null}
                >
                  {busy === "export" ? "Exporting…" : "Export as Text"}
                </button>
              </div>
              {busy && (
                <p className="muted small" role="status">
                  {busy === "import"
                    ? "Importing designs…"
                    : "Exporting reports…"}
                </p>
              )}
            </>
          )}
        </div>
      </dialog>
    </section>
  );
}
