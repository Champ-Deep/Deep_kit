import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { QRCodeRecord } from '../types';

const DB_DIR = path.join(process.env.HOME || '/root', '.deepkit');
const DB_PATH = path.join(DB_DIR, 'qr-generator.db');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS qr_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    format TEXT NOT NULL,
    size INTEGER,
    error_correction TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    scans INTEGER DEFAULT 0
  )
`);

export const insertQRCode = (record: Omit<QRCodeRecord, 'id' | 'created_at' | 'scans'>): number => {
  const stmt = db.prepare(`
    INSERT INTO qr_codes (type, content, filename, filepath, format, size, error_correction)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    record.type,
    record.content,
    record.filename,
    record.filepath,
    record.format,
    record.size,
    record.error_correction
  );

  return result.lastInsertRowid as number;
};

export const getAllQRCodes = (): QRCodeRecord[] => {
  const stmt = db.prepare('SELECT * FROM qr_codes ORDER BY created_at DESC');
  return stmt.all() as QRCodeRecord[];
};

export const getQRCodeById = (id: number): QRCodeRecord | undefined => {
  const stmt = db.prepare('SELECT * FROM qr_codes WHERE id = ?');
  return stmt.get(id) as QRCodeRecord | undefined;
};

export const incrementScanCount = (id: number): void => {
  const stmt = db.prepare('UPDATE qr_codes SET scans = scans + 1 WHERE id = ?');
  stmt.run(id);
};

export const deleteQRCode = (id: number): boolean => {
  const stmt = db.prepare('DELETE FROM qr_codes WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
};

export default db;
