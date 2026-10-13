import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { canWriteTo, desktopDatabasePath } from "../electron/databasePath.js";

const base = {
  appPath: resolve("app"),
  isPackaged: true,
  documentsPath: resolve("Documents"),
  isWritable: () => true,
};

test("portable EXE keeps data beside the EXE", () => {
  assert.equal(
    desktopDatabasePath({ ...base, portableDirectory: resolve("usb") }),
    join(resolve("usb"), "data"),
  );
});

test("portable EXE in a read-only folder falls back to Documents", () => {
  assert.equal(
    desktopDatabasePath({
      ...base,
      portableDirectory: resolve("zip"),
      isWritable: () => false,
    }),
    join(resolve("Documents"), "SkidDesignPro"),
  );
});

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
});

test("canWriteTo creates a writable folder and leaves it empty", () => {
  const root = mkdtempSync(join(tmpdir(), "skid-write-"));
  try {
    const target = join(root, "data");
    assert.equal(canWriteTo(target), true);
    assert.deepEqual(readdirSync(target), []);
    assert.equal(canWriteTo(join(root, "data", "\0bad")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
