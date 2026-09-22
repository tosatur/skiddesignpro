import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { designService } from "../services/designService.js";
import { LoadState } from "./PageHeading.jsx";
import Field from "./Field.jsx";
import WastewaterFields from "./WastewaterFields.jsx";
import SpaceFields from "./SpaceFields.jsx";
import { exactSulphurTotal } from "../../../shared/measurements.js";

export default function DesignForm({
  initial,
  onSave,
  cancelTo,
  deleteAction,
}) {
  const [config, setConfig] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(() =>
    initial ? structuredClone(initial) : null,
  );
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    designService
      .config()
      .then((data) => {
        if (!active) return;
        setConfig(data);
        setForm(
          (previous) =>
            previous ?? {
              designName: "",
              clientName: "",
              flowRate: "",
              dailyVolume: "",
              inletPH: "",
              temperature: "",
              ...data.defaults,
              customWastewaterData: {},
              spaceConstraint: { type: "container" },
            },
        );
      })
      .catch((error) => active && setLoadError(error.message));
    return () => {
      active = false;
    };
  }, []);
  if (!config || !form) return <LoadState error={loadError} />;
  const calculatedSulphur =
    form.wastewaterProfile === "custom"
      ? exactSulphurTotal(form.customWastewaterData)
      : null;
  const hasPH = [form.inletPH, form.targetPH].every(
    (value) => value !== "" && value != null && Number.isFinite(Number(value)),
  );
  const direction = hasPH
    ? Math.sign(Number(form.targetPH) - Number(form.inletPH))
    : null;
  const set = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const field = (key, label, unit, type = "number") => (
    <Field
      key={key}
      name={key}
      label={label}
      unit={unit}
      type={type}
      value={form[key]}
      error={errors[key]}
      maxLength={config.inputLimits.nameLength}
      onChange={(value) => set(key, value)}
    />
  );
  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setErrors({});
    setBusy(true);
    const numeric = (value) =>
      value === "" || value == null ? null : Number(value);
    const inputs = { ...form };
    inputs.customWastewaterData =
      form.wastewaterProfile === "typical"
        ? {}
        : {
            ...form.customWastewaterData,
            // Submit components, not a derived total or a hidden stale manual total.
            sulphur:
              calculatedSulphur === null
                ? (form.customWastewaterData.sulphur ?? "")
                : "",
          };
    for (const key of [
      "flowRate",
      "dailyVolume",
      "inletPH",
      "targetPH",
      "temperature",
    ])
      inputs[key] = numeric(form[key]);
    if (form.spaceConstraint.type === "custom")
      inputs.spaceConstraint = {
        type: "custom",
        ...Object.fromEntries(
          ["length", "width"].map((key) => [
            key,
            numeric(form.spaceConstraint[key]),
          ]),
        ),
      };
    try {
      await onSave(inputs);
    } catch (error) {
      setMessage(error.message);
      setErrors(error.fields || {});
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"]')?.focus(),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="design-form" onSubmit={submit} noValidate>
      <fieldset disabled={busy}>
        <section className="card form-card">
          <h2>Project information</h2>
          <div className="form-grid">
            {field("designName", "Project / Design Name", null, "text")}
            {field("clientName", "Client / Facility Name", null, "text")}
          </div>
        </section>
        <section className="card form-card">
          <h2>Wastewater</h2>
          <div className="form-grid">
            {field("flowRate", "Design Flow Rate", "kL/h")}
            {field("dailyVolume", "Daily Wastewater Volume", "kL/day")}
            {field("inletPH", "Inlet pH")}
            {field("targetPH", "Target pH")}
            {field("temperature", "Wastewater Temperature", "°C")}
          </div>
          <WastewaterFields
            profile={form.wastewaterProfile}
            values={form.customWastewaterData}
            parameters={config.wastewater}
            errors={errors}
            onProfileChange={(value) => set("wastewaterProfile", value)}
            onChange={(value) => set("customWastewaterData", value)}
            calculatedSulphur={calculatedSulphur}
          />
          {direction === -1 && (
            <div className="field chemical-field">
              <label htmlFor="acid">Acid candidate</label>
              <select
                id="acid"
                value={form.acidId}
                onChange={(e) => set("acidId", e.target.value)}
              >
                {config.chemicals
                  .filter((c) => c.type === "acid")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <p className="muted small">Used when lowering pH</p>
            </div>
          )}
          {direction === 1 && (
            <div className="field chemical-field">
              <label htmlFor="caustic">Caustic candidate</label>
              <input
                id="caustic"
                value={config.chemicals.find((c) => c.type === "caustic").name}
                readOnly
              />
              <p className="muted small">Used when raising pH</p>
            </div>
          )}
          {direction === 0 && (
            <p className="muted small chemical-field">
              Inlet pH equals target pH. No pH correction direction is currently
              required.
            </p>
          )}
        </section>
        <SpaceFields
          value={form.spaceConstraint}
          errors={errors}
          onChange={(value) => set("spaceConstraint", value)}
        />
      </fieldset>
      {message && (
        <div className="notice error" role="alert">
          {message}
        </div>
      )}
      <div className="form-actions">
        {deleteAction && (
          <fieldset className="delete-action" disabled={busy}>
            {deleteAction}
          </fieldset>
        )}
        <Link className="button" to={cancelTo}>
          Cancel
        </Link>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save Changes" : "Generate Design"}
        </button>
      </div>
    </form>
  );
}
