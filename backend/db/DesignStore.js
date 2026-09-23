import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { atomicWriteFile } from "../util/atomicWrite.js";

// One JSON file per design (named by id), instead of one shared database file.
// This keeps a shared/synced folder (network drive, OneDrive, SharePoint) safe:
// a sync conflict can only affect a single design's file, never the whole
// library, and there is no database lock file for a network filesystem to
// mishandle. ":memory:" keeps everything in memory only, for tests.
// The .spnd extension is plain JSON underneath; it just keeps saved designs
// distinct from unrelated .json files that may end up in the same folder.
const EXTENSION = ".spnd";

export class DesignStore {
  constructor(dir) {
    this.dir = dir;
    this.memory = dir === ":memory:" ? new Map() : null;
    if (!this.memory) mkdirSync(dir, { recursive: true });
  }

  #path(id) {
    return join(this.dir, `${id}${EXTENSION}`);
  }

  #readAll() {
    if (this.memory) return [...this.memory.values()];
    return readdirSync(this.dir)
      .filter((name) => name.endsWith(EXTENSION))
      .map((name) => JSON.parse(readFileSync(join(this.dir, name), "utf8")));
  }

  // Synchronous so a read-modify-write (see update()) cannot interleave with
  // another request in this process, matching the SQL transaction it replaces.
  #write(design) {
    if (this.memory) return void this.memory.set(design.id, design);
    atomicWriteFile(this.#path(design.id), JSON.stringify(design));
  }

  list() {
    return this.#readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id) {
    if (this.memory) return this.memory.get(id) ?? null;
    const path = this.#path(id);
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
  }

  create(design) {
    this.#write(design);
    return design;
  }

  update(design, previousRevision) {
    const current = this.get(design.id);
    if (!current || current.revision !== previousRevision) {
      const error = new Error(
        "This design changed in another window. Reopen it before editing.",
      );
      error.status = 409;
      throw error;
    }
    this.#write(design);
    return design;
  }

  delete(id) {
    if (this.memory) return this.memory.delete(id);
    const path = this.#path(id);
    if (!existsSync(path)) return false;
    unlinkSync(path);
    return true;
  }

  deleteAll() {
    const designs = this.#readAll();
    for (const design of designs) this.delete(design.id);
    return designs.length;
  }

  close() {}
}
