import { test } from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { desktopDatabasePath } from "../electron/databasePath.js";

const base = {
  appPath: resolve("app"),
  isPackaged: true,
  documentsPath: resolve("Documents"),
};

test("installed app keeps data in Documents", () => {
  assert.equal(
    desktopDatabasePath(base),
    join(resolve("Documents"), "SkidDesignPro"),
  );
});

test("unpackaged app uses the project data folder", () => {
  assert.equal(
    desktopDatabasePath({ ...base, isPackaged: false }),
    join(resolve("app"), "backend", "db", "data"),
  );
});

test("SPN_DATABASE overrides every default", () => {
  assert.equal(
    desktopDatabasePath({ ...base, databaseOverride: "custom" }),
    resolve("custom"),
  );
  assert.equal(
    desktopDatabasePath({
      ...base,
      isPackaged: false,
      databaseOverride: ":memory:",
    }),
    ":memory:",
  );
});
