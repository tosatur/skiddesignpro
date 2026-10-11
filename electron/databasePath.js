import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export function canWriteTo(directory) {
  try {
    mkdirSync(directory, { recursive: true });
    const probe = join(directory, `.write-test-${process.pid}`);
    writeFileSync(probe, "");
    rmSync(probe);
    return true;
  } catch {
    return false;
  }
}

export function desktopDatabasePath({
  appPath,
  isPackaged,
  portableDirectory,
  documentsPath,
  databaseOverride,
  isWritable = canWriteTo,
}) {
  if (databaseOverride)
    return databaseOverride === ":memory:"
      ? databaseOverride
      : resolve(databaseOverride);

  // A portable EXE extracts its runtime into a temporary directory. Use the
  // original EXE's directory so saved designs survive closing or updating it.
  if (isPackaged && portableDirectory) {
    const besideExe = join(resolve(portableDirectory), "data");
    if (isWritable(besideExe)) return besideExe;
  }

  if (isPackaged) return join(resolve(documentsPath), "SkidDesignPro");

  return join(appPath, "backend", "db", "data");
}
