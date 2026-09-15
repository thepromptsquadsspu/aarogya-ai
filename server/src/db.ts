import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'aarogya.db');

let db: DatabaseSync | null = null;

/**
 * Returns the singleton DatabaseSync instance.
 * Creates the data directory and database file if they don't exist.
 */
export function getDb(): DatabaseSync {
  if (!db) {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new DatabaseSync(DB_PATH);

    // Enable WAL mode for performance
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
  }
  return db;
}

/**
 * Initializes the database by creating required tables.
 */
export function initDb(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      sex TEXT NOT NULL CHECK(sex IN ('male','female','other')),
      language TEXT NOT NULL DEFAULT 'en',
      chief_complaint TEXT NOT NULL DEFAULT '',
      vitals TEXT NOT NULL DEFAULT '{}',
      body_regions TEXT NOT NULL DEFAULT '[]',
      transcript TEXT NOT NULL DEFAULT '[]',
      esi_level INTEGER NOT NULL CHECK(esi_level BETWEEN 1 AND 5),
      triage_result TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'Waiting' CHECK(status IN ('Waiting','In Treatment','Discharged')),
      wait_minutes INTEGER DEFAULT 0,
      assigned_doctor TEXT,
      bed TEXT,
      is_simulated INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log('[DB] Database initialized at', DB_PATH);
}

/**
 * Closes the database connection.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
