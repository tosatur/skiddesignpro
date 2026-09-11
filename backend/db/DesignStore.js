import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export class DesignStore {
  constructor(path) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS designs (
        id TEXT PRIMARY KEY, updated_at TEXT NOT NULL,
        revision INTEGER NOT NULL, document TEXT NOT NULL
      );`);
  }

  list() {
    return this.db
      .prepare("SELECT document FROM designs ORDER BY updated_at DESC")
      .all()
      .map((row) => JSON.parse(row.document));
  }

  get(id) {
    const row = this.db
      .prepare("SELECT document FROM designs WHERE id = ?")
      .get(id);
    return row ? JSON.parse(row.document) : null;
  }

  create(design) {
    this.db
      .prepare("INSERT INTO designs VALUES (?, ?, ?, ?)")
      .run(
        design.id,
        design.updatedAt,
        design.revision,
        JSON.stringify(design),
      );
    return design;
  }

  update(design, previousRevision) {
    const result = this.db
      .prepare(
        "UPDATE designs SET updated_at = ?, revision = ?, document = ? WHERE id = ? AND revision = ?",
      )
      .run(
        design.updatedAt,
        design.revision,
        JSON.stringify(design),
        design.id,
        previousRevision,
      );
    if (!result.changes) {
      const error = new Error(
        "This design changed in another window. Reopen it before editing.",
      );
      error.status = 409;
      throw error;
    }
    return design;
  }

  delete(id) {
    // The complete design (including any saved generated data) is one row.
    // PDFs are generated on demand and are not stored separately.
    return (
      this.db.prepare("DELETE FROM designs WHERE id = ?").run(id).changes > 0
    );
  }

  deleteAll() {
    return this.db.prepare("DELETE FROM designs").run().changes;
  }

  close() {
    this.db.close();
  }
}
