// A small D1-compatible wrapper around node:sqlite, for local development and tests.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function createD1(migrationsDir, file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  for (const f of readdirSync(migrationsDir).filter((n) => n.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(migrationsDir, f), 'utf8'));
  }
  const stmt = (sql, params = []) => ({
    bind: (...p) => stmt(sql, p),
    first: async () => db.prepare(sql).get(...params) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...params) }),
    run: async () => { const r = db.prepare(sql).run(...params); return { success: true, meta: { changes: Number(r.changes) } }; },
    _exec: () => db.prepare(sql).run(...params),
  });
  return {
    raw: db,
    prepare: (sql) => stmt(sql),
    batch: async (list) => {
      db.exec('BEGIN');
      try { list.forEach((s) => s._exec()); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
      return [];
    },
  };
}
