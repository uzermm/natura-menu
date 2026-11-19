import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const dataDir = resolve(process.env.ONLINE_DATA_DIR || ((process.env.DATA_DIR || 'data') + '/online'));
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
export const sqlite = new DatabaseSync(resolve(dataDir, 'sites.sqlite'));
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
export const dataKey = () => readFileSync(resolve(dataDir, 'sites-data.key'), 'utf8').trim();

export function transaction(work) {
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    sqlite.exec('COMMIT');
    return result;
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

sqlite.exec('CREATE TABLE IF NOT EXISTS applied_migrations (name TEXT PRIMARY KEY)');
for (const name of readdirSync(new URL('../drizzle/', import.meta.url)).filter(name => name.endsWith('.sql')).sort()) {
  transaction(() => {
    if (sqlite.prepare('SELECT name FROM applied_migrations WHERE name=?').get(name)) return;
    sqlite.exec(readFileSync(new URL('../drizzle/' + name, import.meta.url), 'utf8'));
    sqlite.prepare('INSERT INTO applied_migrations VALUES (?)').run(name);
  });
}

export const DB = {
  prepare(sql) {
    return {
      bind(...args) {
        const statement = sqlite.prepare(sql);
        return {
          first: (column) => {
            const row = statement.get(...args);
            return column ? row?.[column] ?? null : row ?? null;
          },
          all: () => ({ results: statement.all(...args) }),
          run: () => {
            const { changes } = statement.run(...args);
            return { success: true, meta: { changes } };
          }
        };
      }
    };
  },
  batch: (statements) => transaction(() => statements.map(statement => statement.run()))
};
