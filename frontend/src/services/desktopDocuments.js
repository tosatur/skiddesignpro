// Tracks designs currently open in this desktop session (opened, created, or
// just saved), keyed by the design's own id. The user chose where each file
// lives on disk, so there is no managed folder to look things up from — this
// module is the frontend's record of "where is this design's file."
const documents = new Map();

export const isDesktop = () =>
  typeof window !== "undefined" && Boolean(window.spn);

export function rememberDocument(path, design) {
  documents.set(design.id, { path, design });
  return design;
}

export function getDocument(id) {
  const doc = documents.get(id);
  if (!doc)
    throw new Error(
      "This design isn't open anymore. Go to Home and open it again from Recent files.",
    );
  return doc;
}

export function forgetDocument(id) {
  documents.delete(id);
}
