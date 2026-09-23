import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const MAX_RECENT = 15;

function readList(listPath) {
  if (!existsSync(listPath)) return [];
  try {
    return JSON.parse(readFileSync(listPath, "utf8"));
  } catch {
    return [];
  }
}

// Drops entries whose file no longer exists, so the list stays honest after a
// design was moved, renamed, or deleted outside the app.
export function listRecent(listPath) {
  return readList(listPath).filter((entry) => existsSync(entry.path));
}

export function touchRecent(listPath, entry) {
  const list = readList(listPath).filter((e) => e.path !== entry.path);
  list.unshift(entry);
  mkdirSync(dirname(listPath), { recursive: true });
  writeFileSync(listPath, JSON.stringify(list.slice(0, MAX_RECENT)));
}

export function removeRecent(listPath, path) {
  writeFileSync(
    listPath,
    JSON.stringify(readList(listPath).filter((e) => e.path !== path)),
  );
}
