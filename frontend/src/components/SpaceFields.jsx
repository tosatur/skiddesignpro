import Field from "./Field.jsx";

export default function SpaceFields({ value, errors, onChange }) {
  return (
    <section className="card form-card">
      <h2>Available space</h2>
      <div className="field">
        <label htmlFor="space">Space constraint</label>
        <select
          id="space"
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value })}
        >
          <option value="container">Standard 20 ft container limit</option>
          <option value="custom">Custom available footprint</option>
        </select>
      </div>
      {value.type === "custom" && (
        <div className="form-grid space-fields">
          {["length", "width"].map((key) => (
            <Field
              key={key}
              name={`spaceConstraint.${key}`}
              label={`Maximum ${key}`}
              unit="m"
              value={value[key]}
              error={errors[`spaceConstraint.${key}`]}
              onChange={(next) => onChange({ ...value, [key]: next })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
