import { dirname, join, resolve } from "node:path";

export function desktopDatabasePath({
  appPath,
  isPackaged,
  executablePath,
  portableDirectory,
  databaseOverride,
}) {
  if (databaseOverride)
    return databaseOverride === ":memory:"
      ? databaseOverride
      : resolve(databaseOverride);

  // A portable EXE extracts its runtime into a temporary directory. Use the
  // original EXE's directory so saved designs survive closing or updating it.
  if (isPackaged)
    return join(resolve(portableDirectory || dirname(executablePath)), "data");

  return join(appPath, "backend", "db", "data");
}
