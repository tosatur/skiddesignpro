import { useEffect, useState } from "react";
import PageHeading from "../components/PageHeading.jsx";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import { designService } from "../services/designService.js";

export default function EquipmentPage() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    designService
      .equipmentSettings()
      .then((data) => {
        if (active) {
          setSettings(data);
          setError("");
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [attempt]);

  async function change(changes, confirmation) {
    setBusy(true);
    setError("");
    setMessage("Saving changes…");
    try {
      setSettings(await designService.setEquipmentSettings(changes));
      setMessage(confirmation);
    } catch (e) {
      setError(e.message);
      setMessage("Change not saved.");
    } finally {
      setBusy(false);
    }
  }

  const groups = [...new Set(settings?.options.map((option) => option.group))];
  const enabledCount =
    settings?.options.filter(({ id }) => settings.enabled[id]).length ?? 0;

  return (
    <>
      <PageHeading
        title="Equipment settings"
        description="Choose which equipment to include in new and regenerated skid designs. Changes save automatically; existing calculated designs keep their saved selection."
      />
      {error && (
        <div className="notice error" role="alert">
          {error}
          {!settings && (
            <>
              {" "}
              <button
                className="text-button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Try again
              </button>
            </>
          )}
        </div>
      )}
      {!settings ? (
        !error && <p role="status">Loading equipment…</p>
      ) : (
        <>
          <div className="equipment-toolbar">
            <div>
              <strong>
                {enabledCount} of {settings.options.length} enabled
              </strong>
              <p className="muted small">
                Enabled items are included when required by the design.
              </p>
            </div>
            <button
              className="button"
              disabled={busy || enabledCount === settings.options.length}
              onClick={() =>
                change(
                  Object.fromEntries(
                    settings.options.map(({ id }) => [id, true]),
                  ),
                  "All equipment enabled.",
                )
              }
            >
              Enable all
            </button>
          </div>
          <div className="equipment-settings-grid" aria-busy={busy}>
            {groups.map((group, index) => (
              <section
                className="card equipment-group"
                key={group}
                aria-labelledby={`equipment-group-${index}`}
              >
                <h2 id={`equipment-group-${index}`}>{group}</h2>
                <ul className="equipment-options">
                  {settings.options
                    .filter((option) => option.group === group)
                    .map((option) => {
                      const dependency =
                        option.requiresTank && !settings.enabled.tank
                          ? "Omitted while balancing tanks are disabled."
                          : option.requiresDosing &&
                              !settings.enabled.causticDosingPump &&
                              !settings.enabled.acidDosingPump
                            ? "Omitted while both dosing trains are disabled."
                            : null;
                      return (
                        <li className="equipment-option" key={option.id}>
                          <div>
                            <h3>{option.name}</h3>
                            <p id={`equipment-description-${option.id}`}>
                              {option.description}
                              {dependency && (
                                <span className="equipment-dependency">
                                  {dependency}
                                </span>
                              )}
                            </p>
                          </div>
                          <ToggleSwitch
                            label={option.name}
                            checked={settings.enabled[option.id]}
                            disabled={busy}
                            describedBy={`equipment-description-${option.id}`}
                            onChange={(enabled) =>
                              change(
                                { [option.id]: enabled },
                                `${option.name} ${enabled ? "enabled" : "disabled"}.`,
                              )
                            }
                          />
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))}
          </div>
          <div className="equipment-settings-footer">
            <p className="muted small">
              Level instruments, piping and valves use package price allowances.
              Shared skid allowances remain while equipment is selected.
            </p>
            <p className="settings-save-status" role="status">
              {message || "All changes saved."}
            </p>
          </div>
        </>
      )}
    </>
  );
}
