import Database from "better-sqlite3";
import type { Database as SqliteDatabase } from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dbDir = process.env.SQLITE_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(dbDir, { recursive: true });

export const db: SqliteDatabase = new Database(path.join(dbDir, "keys.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT,
    revoked_at TEXT
  )
`);

export interface ApiKeyRow {
  id: number;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreatedKey extends ApiKeyRow {
  key: string;
}

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): CreatedKey {
  const raw = `ak_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = raw.slice(0, 11);
  const info = db
    .prepare(
      `INSERT INTO api_keys (name, prefix, key_hash) VALUES (?, ?, ?) RETURNING id, name, prefix, created_at, last_used_at, revoked_at`
    )
    .get("unnamed", prefix, hashKey(raw)) as ApiKeyRow;
  return { ...info, key: raw };
}

export function renameApiKey(id: number, name: string): ApiKeyRow | undefined {
  return db
    .prepare(
      `UPDATE api_keys SET name = ? WHERE id = ? AND revoked_at IS NULL RETURNING id, name, prefix, created_at, last_used_at, revoked_at`
    )
    .get(name, id) as ApiKeyRow | undefined;
}

export function listApiKeys(): ApiKeyRow[] {
  return db
    .prepare(
      `SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_keys ORDER BY id DESC`
    )
    .all() as ApiKeyRow[];
}

export function revokeApiKey(id: number): boolean {
  const result = db
    .prepare(`UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL`)
    .run(id);
  return result.changes > 0;
}

export function validateApiKey(raw: string): boolean {
  const keyHash = hashKey(raw);
  const result = db
    .prepare(
      `UPDATE api_keys
       SET last_used_at = datetime('now')
       WHERE key_hash = ? AND revoked_at IS NULL`
    )
    .run(keyHash);
  return result.changes > 0;
}

export function countActiveApiKeys(): number {
  return (
    db.prepare(`SELECT COUNT(*) AS count FROM api_keys WHERE revoked_at IS NULL`).get() as {
      count: number;
    }
  ).count;
}