export default function ToggleSwitch({
  label,
  checked,
  onChange,
  disabled = false,
  describedBy,
}) {
  return (
    <button
      type="button"
      className="toggle-switch"
      role="switch"
      aria-label={label}
      title={label}
      aria-checked={checked}
      aria-describedby={describedBy}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
    >
      <span className="toggle-status" aria-hidden="true">
        {checked ? "Enabled" : "Disabled"}
      </span>
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
    </button>
  );
}
