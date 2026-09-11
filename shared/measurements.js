export function parseMeasurement(raw) {
  if (raw === "" || raw == null) return null;
  const text = String(raw).trim();
  if (!/^<?\s*(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const bounded = text.startsWith("<");
  const value = Number(text.replace("<", "").trim());
  if (!Number.isFinite(value) || value < 0 || (bounded && value === 0))
    return null;
  return { low: bounded ? 0 : value, high: value, highExclusive: bounded };
}

export function formatMeasurement(value) {
  if (!value) return "Not supplied";
  const number = (n) => n.toLocaleString("en-AU", { maximumFractionDigits: 2 });
  if (value.low === value.high) return number(value.low);
  if (value.low === 0 && value.highExclusive) return `< ${number(value.high)}`;
  return `${number(value.low)}–${value.highExclusive ? "< " : ""}${number(value.high)}`;
}

export function sumSulphurComponents(values) {
  const components = [values.sulphate, values.sulphite, values.thiosulphate];
  if (!components.every(Boolean)) return null;
  return {
    low: Number(components.reduce((sum, v) => sum + v.low, 0).toPrecision(15)),
    high: Number(
      components.reduce((sum, v) => sum + v.high, 0).toPrecision(15),
    ),
    highExclusive: components.some((v) => v.highExclusive),
  };
}

// Shared by the form and importer. A reporting bound is never an exact total.
export function exactSulphurTotal(raw) {
  const total = sumSulphurComponents(
    Object.fromEntries(
      ["sulphate", "sulphite", "thiosulphate"].map((key) => [
        key,
        parseMeasurement(raw[key]),
      ]),
    ),
  );
  return total && total.low === total.high ? total.high : null;
}
