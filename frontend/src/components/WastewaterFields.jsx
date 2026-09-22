import Field from "./Field.jsx";

export default function WastewaterFields({
  profile,
  values,
  parameters,
  errors,
  onProfileChange,
  onChange,
  calculatedSulphur,
}) {
  return (
    <>
      <div className="field">
        <label htmlFor="profile">Wastewater Profile</label>
        <select
          id="profile"
          value={profile}
          onChange={(e) => onProfileChange(e.target.value)}
        >
          <option value="typical">Typical Dairy Wastewater</option>
          <option value="custom">Custom Wastewater</option>
        </select>
      </div>
      {profile === "custom" && (
        <details className="advanced-section" open>
          <summary>Advanced / Custom Wastewater</summary>
          <p className="muted small">
            Optional. Use a value or a bound, e.g. &lt; 100.
          </p>
          <div className="form-grid three">
            {parameters.map((p) =>
              p.key === "sulphur" && calculatedSulphur !== null ? (
                <div key={p.key} className="field">
                  <label htmlFor="calculated-sulphur">
                    {p.label}
                    <span className="field-unit">{p.unit}</span>
                  </label>
                  <input
                    id="calculated-sulphur"
                    value={calculatedSulphur}
                    readOnly
                    aria-describedby="sulphur-basis"
                  />
                  <p id="sulphur-basis" className="muted small">
                    Calculated from sulphate + sulphite + thiosulphate
                  </p>
                </div>
              ) : (
                <Field
                  key={p.key}
                  name={`customWastewaterData.${p.key}`}
                  label={p.label}
                  unit={p.unit}
                  type="text"
                  required={false}
                  value={values[p.key]}
                  error={errors[`customWastewaterData.${p.key}`]}
                  onChange={(value) => onChange({ ...values, [p.key]: value })}
                />
              ),
            )}
          </div>
        </details>
      )}
    </>
  );
}
