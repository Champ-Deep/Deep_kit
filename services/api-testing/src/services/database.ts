import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.env.HOME || '/root', '.deepkit');
const DB_PATH = path.join(DB_DIR, 'api-testing.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER REFERENCES collections(id),
    name TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers TEXT,
    body TEXT,
    body_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS environments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    variables TEXT,
    active BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER REFERENCES requests(id),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status_code INTEGER,
    response_time_ms INTEGER,
    response_size_bytes INTEGER
  );
`);

// Collections
export const getCollections = () => {
  const stmt = db.prepare('SELECT * FROM collections ORDER BY created_at DESC');
  return stmt.all();
};

export const getCollectionById = (id: number) => {
  const stmt = db.prepare('SELECT * FROM collections WHERE id = ?');
  return stmt.get(id);
};

export const createCollection = (name: string, description: string | null = null) => {
  const stmt = db.prepare('INSERT INTO collections (name, description) VALUES (?, ?)');
  const result = stmt.run(name, description);
  return result.lastInsertRowid;
};

export const deleteCollection = (id: number) => {
  const stmt = db.prepare('DELETE FROM collections WHERE id = ?');
  stmt.run(id);
};

// Requests
export const getRequests = (collectionId?: number) => {
  if (collectionId) {
    const stmt = db.prepare('SELECT * FROM requests WHERE collection_id = ? ORDER BY created_at DESC');
    return stmt.all(collectionId);
  }
  const stmt = db.prepare('SELECT * FROM requests ORDER BY created_at DESC');
  return stmt.all();
};

export const getRequestById = (id: number) => {
  const stmt = db.prepare('SELECT * FROM requests WHERE id = ?');
  return stmt.get(id);
};

export const createRequest = (
  name: string,
  method: string,
  url: string,
  collectionId: number | null = null,
  headers: string | null = null,
  body: string | null = null,
  bodyType: string | null = null
) => {
  const stmt = db.prepare(
    'INSERT INTO requests (name, method, url, collection_id, headers, body, body_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, method, url, collectionId, headers, body, bodyType);
  return result.lastInsertRowid;
};

export const updateRequest = (
  id: number,
  name: string,
  method: string,
  url: string,
  headers: string | null = null,
  body: string | null = null,
  bodyType: string | null = null
) => {
  const stmt = db.prepare(
    'UPDATE requests SET name = ?, method = ?, url = ?, headers = ?, body = ?, body_type = ? WHERE id = ?'
  );
  stmt.run(name, method, url, headers, body, bodyType, id);
};

export const deleteRequest = (id: number) => {
  const stmt = db.prepare('DELETE FROM requests WHERE id = ?');
  stmt.run(id);
};

// Environments
export const getEnvironments = () => {
  const stmt = db.prepare('SELECT * FROM environments ORDER BY created_at DESC');
  return stmt.all();
};

export const getActiveEnvironment = () => {
  const stmt = db.prepare('SELECT * FROM environments WHERE active = 1 LIMIT 1');
  return stmt.get();
};

export const createEnvironment = (name: string, variables: string, active: number = 0) => {
  if (active) {
    // Deactivate all other environments
    db.prepare('UPDATE environments SET active = 0').run();
  }
  const stmt = db.prepare('INSERT INTO environments (name, variables, active) VALUES (?, ?, ?)');
  const result = stmt.run(name, variables, active);
  return result.lastInsertRowid;
};

export const setActiveEnvironment = (id: number) => {
  db.prepare('UPDATE environments SET active = 0').run();
  const stmt = db.prepare('UPDATE environments SET active = 1 WHERE id = ?');
  stmt.run(id);
};

export const deleteEnvironment = (id: number) => {
  const stmt = db.prepare('DELETE FROM environments WHERE id = ?');
  stmt.run(id);
};

// History
export const getHistory = (limit: number = 50) => {
  const stmt = db.prepare('SELECT * FROM history ORDER BY timestamp DESC LIMIT ?');
  return stmt.all(limit);
};

export const addHistoryEntry = (
  requestId: number | null,
  statusCode: number,
  responseTimeMs: number,
  responseSizeBytes: number
) => {
  const stmt = db.prepare(
    'INSERT INTO history (request_id, status_code, response_time_ms, response_size_bytes) VALUES (?, ?, ?, ?)'
  );
  stmt.run(requestId, statusCode, responseTimeMs, responseSizeBytes);
};

export default db;
