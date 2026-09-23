import {
  forgetDocument,
  getDocument,
  isDesktop,
  rememberDocument,
} from "./desktopDocuments.js";

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

// Desktop equivalents of the store-backed routes below: compute/view a design
// from whatever is posted, instead of one looked up by id in a managed folder.
const compute = (inputs, previous) =>
  request("/design-tools/compute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs, previous }),
  });
const view = (design) =>
  request("/design-tools/view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(design),
  });

export const designService = {
  config: () => request("/config"),
  list: () => request("/designs"),
  get: async (id, viewMode) => {
    if (!isDesktop())
      return request(
        `/designs/${id}${viewMode === "settings" ? "?view=settings" : ""}`,
      );
    const { design } = getDocument(id);
    return viewMode === "settings" ? design : view(design);
  },
  create: async (inputs) => {
    if (!isDesktop())
      return request("/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs }),
      });
    const design = await compute(inputs);
    const saved = await window.spn.saveDesignAs(design, design.designName);
    if (!saved)
      throw new Error("No file was saved. Try again and choose a save location.");
    return rememberDocument(saved.path, design);
  },
  import: (inputs) =>
    request("/designs/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs),
    }),
  delete: async (id) => {
    if (!isDesktop()) return request(`/designs/${id}`, { method: "DELETE" });
    const { path } = getDocument(id);
    await window.spn.removeRecentDesign(path);
    forgetDocument(id);
    return { deleted: true };
  },
  deleteAll: () => request("/designs", { method: "DELETE" }),
  update: async (id, inputs, revision) => {
    if (!isDesktop())
      return request(`/designs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, revision }),
      });
    const { path, design: previous } = getDocument(id);
    const design = await compute(inputs, previous);
    await window.spn.saveDesign(design, path);
    return rememberDocument(path, design);
  },
};
