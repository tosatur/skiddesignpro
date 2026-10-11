import { join, resolve } from "node:path";

export function desktopDatabasePath({
  appPath,
  isPackaged,
  documentsPath,
  databaseOverride,
}) {
  if (databaseOverride)
    return databaseOverride === ":memory:"
      ? databaseOverride
      : resolve(databaseOverride);

  if (isPackaged) return join(resolve(documentsPath), "SkidDesignPro");

  return join(appPath, "backend", "db", "data");
}
