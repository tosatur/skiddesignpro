export const number = (value, digits = 1) =>
  Number(value).toLocaleString("en-AU", { maximumFractionDigits: digits });
export const money = (value, currency) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
export const date = (value) =>
  new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export const dimension = (value) =>
  value == null ? "Unavailable" : `${number(value, 6)} m`;
export const footprint = (d) =>
  d?.length == null || d?.width == null
    ? "Unavailable"
    : `${number(d.length, 6)} × ${number(d.width, 6)} m`;
