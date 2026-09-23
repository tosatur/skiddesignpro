import { renameSync, writeFileSync } from "node:fs";

// Atomic on POSIX and Windows (Node's fs.rename uses MoveFileExW with
// MOVEFILE_REPLACE_EXISTING on Windows), so a reader never sees a partial
// write, and a sync client (OneDrive/SharePoint) sees one clean change
// instead of an in-place overwrite.
export function atomicWriteFile(path, content) {
  const tempPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tempPath, content);
  renameSync(tempPath, path);
}
