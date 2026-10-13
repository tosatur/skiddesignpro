import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DesignStore } from "../backend/db/DesignStore.js";
import { PriceLibrary } from "../backend/db/PriceLibrary.js";
import { AppSettings } from "../backend/db/AppSettings.js";
import { atomicWriteFile } from "../backend/util/atomicWrite.js";
import {
  listRecent,
  removeRecent,
  touchRecent,
} from "../electron/recentFiles.js";

const withTempDir = (run) => (t) => {
  const dir = mkdtempSync(join(tmpdir(), "skid-store-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return run(dir);
};
const design = (id, updatedAt, revision = 1) => ({
  id,
  designName: id,
  updatedAt,
  revision,
});

test(
  "designs are saved as one .spnd file each",
  withTempDir((dir) => {
    const store = new DesignStore(join(dir, "nested", "data"));
    store.create(design("a", "2026-01-01T00:00:00.000Z"));
    store.create(design("b", "2026-02-01T00:00:00.000Z"));
    writeFileSync(join(store.dir, "notes.json"), "{}");
    assert.deepEqual(readdirSync(store.dir).sort(), [
      "a.spnd",
      "b.spnd",
      "notes.json",
    ]);
    assert.deepEqual(
      store.list().map((d) => d.id),
      ["b", "a"],
    );
    assert.equal(new DesignStore(store.dir).get("a").designName, "a");
    assert.equal(store.get("missing"), null);
  }),
);

test(
  "updates must start from the saved revision",
  withTempDir((dir) => {
    const store = new DesignStore(dir);
    store.create(design("a", "2026-01-01T00:00:00.000Z", 1));
    store.update(design("a", "2026-01-02T00:00:00.000Z", 2), 1);
    assert.equal(store.get("a").revision, 2);
    assert.throws(
      () => store.update(design("a", "2026-01-03T00:00:00.000Z", 3), 1),
      (error) => error.status === 409,
    );
    assert.throws(
      () => store.update(design("gone", "2026-01-03T00:00:00.000Z", 2), 1),
      (error) => error.status === 409,
    );
    assert.equal(store.get("a").revision, 2);
  }),
);

test(
  "deleting a design removes only its file",
  withTempDir((dir) => {
    const store = new DesignStore(dir);
    for (const id of ["a", "b"])
      store.create(design(id, "2026-01-01T00:00:00.000Z"));
    assert.equal(store.delete("a"), true);
    assert.equal(store.delete("a"), false);
    assert.deepEqual(readdirSync(dir), ["b.spnd"]);
  }),
);

test("the in-memory store behaves like the folder store", () => {
  const store = new DesignStore(":memory:");
  store.create(design("a", "2026-01-01T00:00:00.000Z"));
  assert.equal(store.get("a").id, "a");
  assert.equal(store.list().length, 1);
  assert.equal(store.delete("a"), true);
  assert.equal(store.get("a"), null);
  assert.deepEqual(store.list(), []);
});

test(
  "atomic writes replace the file and leave no temp file behind",
  withTempDir((dir) => {
    const path = join(dir, "file.json");
    atomicWriteFile(path, "first");
    atomicWriteFile(path, "second");
    assert.equal(readFileSync(path, "utf8"), "second");
    assert.deepEqual(readdirSync(dir), ["file.json"]);
  }),
);

test(
  "library quotes persist in prices.json",
  withTempDir((dir) => {
    const prices = new PriceLibrary(dir);
    assert.equal(existsSync(join(dir, "prices.json")), false);
    const saved = prices.set("agitator", {
      unitCost: 1500,
      status: "quoted",
      quoteRef: "Q-9",
    });
    assert.equal(saved.unitCost, 1500);
    assert.equal(saved.estimate, 1200);
    assert.ok(saved.updatedAt);
    const reopened = new PriceLibrary(dir).book().agitator;
    assert.equal(reopened.status, "quoted");
    assert.equal(reopened.quoteRef, "Q-9");
    new PriceLibrary(dir).reset("agitator");
    assert.equal(new PriceLibrary(dir).book().agitator.unitCost, 1200);
  }),
);

test("unknown price keys are ignored", () => {
  const prices = new PriceLibrary(":memory:");
  assert.equal(prices.set("tank:3", { unitCost: 1, status: "quoted" }), null);
  assert.equal(prices.reset("nothing"), null);
  assert.equal(prices.book()["tank:3"], undefined);
});

test("the price list covers every configured item", () => {
  const keys = new PriceLibrary(":memory:").list().map((p) => p.key);
  for (const key of ["tank:2", "tank:20", "pump:5", "pump:100", "coolingHx"])
    assert.ok(keys.includes(key), key);
  assert.equal(new Set(keys).size, keys.length);
});

test(
  "app settings persist dev mode and equipment defaults",
  withTempDir((dir) => {
    const settings = new AppSettings(dir);
    assert.equal(settings.get().devMode, false);
    assert.equal(settings.get().equipmentEnabled.tank, true);
    settings.setDevMode(true);
    settings.updateEquipment({ tank: false });
    settings.updateEquipment({ agitator: false });
    const reopened = new AppSettings(dir).get();
    assert.equal(reopened.devMode, true);
    assert.equal(reopened.equipmentEnabled.tank, false);
    assert.equal(reopened.equipmentEnabled.agitator, false);
    assert.equal(reopened.equipmentEnabled.feedPump, true);
  }),
);

test(
  "a hand-edited settings file is normalised",
  withTempDir((dir) => {
    writeFileSync(
      join(dir, "settings.json"),
      JSON.stringify({ devMode: "yes", equipmentEnabled: { tank: 0 } }),
    );
    const settings = new AppSettings(dir).get();
    assert.equal(settings.devMode, false);
    assert.equal(settings.equipmentEnabled.tank, true);
  }),
);

test(
  "recent files list newest first without duplicates",
  withTempDir((dir) => {
    const listPath = join(dir, "config", "recent.json");
    const files = ["one", "two", "three"].map((name) => {
      const path = join(dir, `${name}.spnd`);
      writeFileSync(path, "{}");
      return path;
    });
    for (const path of files) touchRecent(listPath, { path });
    touchRecent(listPath, { path: files[0], designName: "again" });
    assert.deepEqual(
      listRecent(listPath).map((entry) => entry.path),
      [files[0], files[2], files[1]],
    );
    assert.equal(listRecent(listPath)[0].designName, "again");
    rmSync(files[2]);
    assert.deepEqual(
      listRecent(listPath).map((entry) => entry.path),
      [files[0], files[1]],
    );
    removeRecent(listPath, files[0]);
    assert.deepEqual(
      listRecent(listPath).map((entry) => entry.path),
      [files[1]],
    );
  }),
);

test(
  "recent files keep the latest fifteen and survive a corrupt list",
  withTempDir((dir) => {
    const listPath = join(dir, "recent.json");
    for (let i = 0; i < 20; i++) touchRecent(listPath, { path: `${i}` });
    const saved = JSON.parse(readFileSync(listPath, "utf8"));
    assert.equal(saved.length, 15);
    assert.equal(saved[0].path, "19");
    writeFileSync(listPath, "not json");
    assert.deepEqual(listRecent(listPath), []);
    assert.deepEqual(listRecent(join(dir, "missing.json")), []);
  }),
);
