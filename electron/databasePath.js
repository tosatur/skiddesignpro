import { join, resolve } from "node:path";

export function desktopDatabasePath({
  appPath,
  isPackaged,
  portableDirectory,
  documentsPath,
  databaseOverride,
}) {
  if (databaseOverride)
    return databaseOverride === ":memory:"
      ? databaseOverride
      : resolve(databaseOverride);

  // A portable EXE extracts its runtime into a temporary directory. Use the
  // original EXE's directory so saved designs survive closing or updating it.
  if (isPackaged && portableDirectory)
    return join(resolve(portableDirectory), "data");

  if (isPackaged) return join(resolve(documentsPath), "SkidDesignPro");

  return join(appPath, "backend", "db", "data");
}
