async function request(path, options) {
  let response;
  try {
    response = await fetch(`/api${path}`, options);
  } catch {
    throw new Error(
      "Cannot connect to the local design server. Start the app and try again.",
    );
  }
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Could not complete this request.");
    error.fields = data.fields;
    throw error;
  }
  return data;
}
export const designService = {
  config: () => request("/config"),
  list: () => request("/designs"),
  get: (id, view) =>
    request(`/designs/${id}${view === "settings" ? "?view=settings" : ""}`),
  create: (inputs) =>
    request("/designs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs }),
    }),
  import: (inputs) =>
    request("/designs/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs),
    }),
  delete: (id) => request(`/designs/${id}`, { method: "DELETE" }),
  deleteAll: () => request("/designs", { method: "DELETE" }),
  update: (id, inputs, revision) =>
    request(`/designs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs, revision }),
    }),
};
