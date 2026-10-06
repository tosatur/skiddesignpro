import { useEffect, useRef, useState } from "react";
import { designService } from "../services/designService.js";

export default function EquipmentSettingsStatus({ design, onUpdated }) {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const panel = useRef(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      designService
        .equipmentSettings()
        .then((data) => {
          if (active) {
            setSettings(data);
            setError("");
          }
        })
        .catch((e) => active && setError(e.message));
    load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [attempt, design.id, design.revision]);

  useEffect(() => {
    if (restoreFocus.current && !busy) {
      panel.current?.focus();
      restoreFocus.current = false;
    }
  }, [busy, design.revision]);

  async function update() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await designService.updateEquipment(design.id, design.revision);
      setMessage("Equipment updated for this design.");
      restoreFocus.current = true;
      onUpdated();
    } catch (e) {
      setError(e.message);
      if (e.status === 409) onUpdated();
    } finally {
      setBusy(false);
    }
  }

  const changes =
    settings?.options.filter(
      ({ id }) =>
        (design.equipmentEnabled?.[id] !== false) !== settings.enabled[id],
    ) ?? [];
  const olderDesign = !design.equipmentEnabled;
  const differs = olderDesign || changes.length > 0;

  return (
    <div
      className={`equipment-sync ${settings && !differs ? "current" : ""}`}
      ref={panel}
      tabIndex={-1}
      aria-label="Equipment settings status"
    >
      {error ? (
        <div className="equipment-sync-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="button subtle"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Check again
          </button>
        </div>
      ) : !settings ? (
        <p className="muted small" role="status">
          Checking equipment settings…
        </p>
      ) : (
        <>
          <div className="equipment-sync-content">
            <span className="equipment-sync-mark" aria-hidden="true">
              {differs ? "↻" : "✓"}
            </span>
            <div>
              <p className="equipment-sync-label">
                {differs
                  ? "Equipment settings changed"
                  : "Equipment settings are current"}
              </p>
              {differs && (
                <p className="muted small">
                  {olderDesign
                    ? "This design uses an earlier equipment selection."
                    : `${changes.length} equipment ${changes.length === 1 ? "choice differs" : "choices differ"} from the current settings.`}{" "}
                  Update to recalculate this design.
                </p>
              )}
            </div>
          </div>
          {differs && (
            <button
              type="button"
              className="button equipment-update-button"
              onClick={update}
              disabled={busy}
            >
              {busy ? "Updating…" : "Update equipment"}
            </button>
          )}
        </>
      )}
      {message && (
        <p className="equipment-sync-message muted small" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
