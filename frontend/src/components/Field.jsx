export default function Field({
  label,
  name,
  value,
  onChange,
  error,
  unit,
  type = "number",
  required = true,
  maxLength,
}) {
  const id = `field-${name}`;
  return (
    <div className={`field ${error ? "invalid" : ""}`}>
      <label htmlFor={id}>
        {label}
        {unit && <span className="field-unit">{unit}</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        step={type === "number" ? "any" : undefined}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <small id={`${id}-error`} className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}
