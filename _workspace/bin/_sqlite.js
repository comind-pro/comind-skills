/**
 * SQLite shim. Prefer `better-sqlite3` (faster, requires native build),
 * fall back to the Node built-in `node:sqlite` (zero install, Node 22+).
 *
 *   const { open } = require('./_sqlite');
 *   const db = open('/path/to/file.sqlite');
 *   db.prepare(sql).all(...)  /  .get(...)  /  .run(...)
 *   db.exec(sql)
 *   db.pragma(sql)
 *   db.transaction(fn)
 *   db.close()
 */

let BetterSqlite3 = null;
try { BetterSqlite3 = require('better-sqlite3'); } catch {}

function openBetter(p) { return new BetterSqlite3(p); }

function openBuiltin(p) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(p);
  return {
    _db: db,
    prepare(sql) {
      const stmt = db.prepare(sql);
      return {
        get: (...a) => stmt.get(...a),
        all: (...a) => stmt.all(...a),
        run: (...a) => stmt.run(...a),
      };
    },
    exec(sql) { db.exec(sql); },
    pragma(sql) { db.exec('PRAGMA ' + sql); },
    transaction(fn) {
      return (...a) => {
        db.exec('BEGIN');
        try { const r = fn(...a); db.exec('COMMIT'); return r; }
        catch (e) { db.exec('ROLLBACK'); throw e; }
      };
    },
    close() { db.close(); },
  };
}

function open(p) { return BetterSqlite3 ? openBetter(p) : openBuiltin(p); }

module.exports = { open };
