import { useRef, useState } from "react";
import ToggleSwitch from "./ToggleSwitch.jsx";

export default function DesignEquipmentDialog({
  design,
  settings,
  busy,
  error,
  onOpen,
  onSave,
}) {
  const dialog = useRef(null);
  const opener = useRef(null);
  const [draft, setDraft] = useState({});
  const groups = [...new Set(settings.options.map((option) => option.group))];

  function open() {
    setDraft(
      Object.fromEntries(
        settings.options.map(({ id }) => [
          id,
          (design.equipmentEnabled ?? settings.enabled)[id] !== false,
        ]),
      ),
    );
    onOpen();
    dialog.current.showModal();
  }

  function close() {
    dialog.current.close();
    opener.current?.focus();
  }

  return (
    <>
      <button
        ref={opener}
        type="button"
        className="button equipment-update-button"
        disabled={busy}
        onClick={open}
      >
        Edit equipment
      </button>
      <dialog
        ref={dialog}
        className="design-equipment-dialog"
        aria-labelledby="design-equipment-title"
        aria-describedby="design-equipment-description"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (await onSave(draft)) close();
          }}
        >
          <div className="design-equipment-dialog-heading">
            <div>
              <h2 id="design-equipment-title">Equipment for this design</h2>
              <p id="design-equipment-description">
                Choose equipment for {design.designName}. Costs and layout
                recalculate when you save.
              </p>
            </div>
            <button
              type="button"
              className="button subtle"
              disabled={busy}
              onClick={() =>
                setDraft(
                  Object.fromEntries(
                    settings.options.map(({ id }) => [id, true]),
                  ),
                )
              }
            >
              Enable all
            </button>
          </div>
          <div className="design-equipment-groups">
            {groups.map((group, index) => (
              <section
                className="design-equipment-group"
                key={group}
                aria-labelledby={`design-equipment-group-${index}`}
              >
                <h3 id={`design-equipment-group-${index}`}>{group}</h3>
                <ul className="equipment-options">
                  {settings.options
                    .filter((option) => option.group === group)
                    .map((option) => {
                      const dependency =
                        option.requiresTank && !draft.tank
                          ? "Omitted while balancing tanks are disabled."
                          : option.requiresDosing &&
                              !draft.causticDosingPump &&
                              !draft.acidDosingPump
                            ? "Omitted while both dosing trains are disabled."
                            : null;
                      return (
                        <li className="equipment-option" key={option.id}>
                          <div>
                            <h4>{option.name}</h4>
                            <p id={`design-equipment-${option.id}`}>
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
                            checked={Boolean(draft[option.id])}
                            describedBy={`design-equipment-${option.id}`}
                            disabled={busy}
                            onChange={(enabled) =>
                              setDraft((previous) => ({
                                ...previous,
                                [option.id]: enabled,
                              }))
                            }
                          />
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))}
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <div className="design-equipment-dialog-footer">
            <p className="muted small">
              Shared equipment defaults stay unchanged.
            </p>
            <div className="actions">
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={close}
                autoFocus
              >
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save equipment"}
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
