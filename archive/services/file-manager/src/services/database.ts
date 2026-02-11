import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import type { FileRecord, StorageAnalytics, CreateFileRequest, FileStats } from '../types';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create tables first
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255),
        path TEXT NOT NULL,
        mime_type VARCHAR(100),
        size_bytes BIGINT,
        source_service VARCHAR(100),
        uploaded_by VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT NOW(),
        hash VARCHAR(64),
        folder_path VARCHAR(500) DEFAULT '/'
      );

      CREATE TABLE IF NOT EXISTS file_versions (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        path TEXT NOT NULL,
        sha256 VARCHAR(64) NOT NULL,
        size_bytes BIGINT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        change_notes TEXT
      );

      CREATE TABLE IF NOT EXISTS storage_analytics (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(100) NOT NULL,
        total_files INTEGER DEFAULT 0,
        total_size_bytes BIGINT DEFAULT 0,
        last_synced_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add missing columns for migration
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='files' AND column_name='folder_path') THEN
          ALTER TABLE files ADD COLUMN folder_path VARCHAR(500) DEFAULT '/';
        END IF;
      END $$;
    `);

    // Create indexes after columns exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
      CREATE INDEX IF NOT EXISTS idx_files_service ON files(source_service);
      CREATE INDEX IF NOT EXISTS idx_files_uploaded ON files(uploaded_at);
      CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_path);
      CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id);
    `);

    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Files
export async function getFiles(sourceService?: string, search?: string): Promise<FileRecord[]> {
  let query = 'SELECT * FROM files WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (sourceService) {
    query += ` AND source_service = $${paramIndex++}`;
    params.push(sourceService);
  }

  if (search) {
    query += ` AND (filename ILIKE $${paramIndex++} OR original_filename ILIKE $${paramIndex++})`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY uploaded_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getFileById(id: number): Promise<FileRecord | null> {
  const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createFile(file: CreateFileRequest): Promise<FileRecord> {
  const result = await pool.query(
    `INSERT INTO files (filename, original_filename, path, mime_type, size_bytes, source_service, uploaded_by, hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      file.filename,
      file.original_filename || null,
      file.path,
      file.mime_type || null,
      file.size_bytes || null,
      file.source_service || null,
      file.uploaded_by || null,
      file.hash || null
    ]
  );
  return result.rows[0];
}

export async function deleteFile(id: number): Promise<FileRecord | null> {
  const result = await pool.query('DELETE FROM files WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

export async function bulkDeleteFiles(ids: number[]): Promise<number> {
  const result = await pool.query('DELETE FROM files WHERE id = ANY($1)', [ids]);
  return result.rowCount || 0;
}

// Duplicates
export async function getDuplicates(): Promise<{ hash: string; files: FileRecord[] }[]> {
  const result = await pool.query(`
    SELECT hash, COUNT(*) as count
    FROM files
    WHERE hash IS NOT NULL
    GROUP BY hash
    HAVING COUNT(*) > 1
  `);

  const duplicates = await Promise.all(
    result.rows.map(async (row) => {
      const files = await pool.query('SELECT * FROM files WHERE hash = $1', [row.hash]);
      return { hash: row.hash, files: files.rows };
    })
  );

  return duplicates;
}

// Storage Analytics
export async function getStorageAnalytics(): Promise<StorageAnalytics[]> {
  const result = await pool.query('SELECT * FROM storage_analytics ORDER BY service_name ASC');
  return result.rows;
}

export async function updateStorageAnalytics(serviceName: string, totalFiles: number, totalSizeBytes: number): Promise<void> {
  await pool.query(
    `INSERT INTO storage_analytics (service_name, total_files, total_size_bytes, last_synced_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (service_name) DO UPDATE
     SET total_files = $2, total_size_bytes = $3, last_synced_at = NOW()`,
    [serviceName, totalFiles, totalSizeBytes]
  );
}

export async function syncStorageAnalytics(): Promise<void> {
  const result = await pool.query(`
    SELECT source_service, COUNT(*) as total_files, COALESCE(SUM(size_bytes), 0) as total_size_bytes
    FROM files
    WHERE source_service IS NOT NULL
    GROUP BY source_service
  `);

  for (const row of result.rows) {
    await updateStorageAnalytics(row.source_service, parseInt(row.total_files, 10), parseInt(row.total_size_bytes, 10));
  }
}

// Stats
export async function getStats(): Promise<FileStats> {
  const [totalResult, duplicatesResult, byServiceResult] = await Promise.all([
    pool.query('SELECT COUNT(*) as total_files, COALESCE(SUM(size_bytes), 0) as total_size FROM files'),
    pool.query(`
      SELECT COUNT(DISTINCT hash) as duplicate_count
      FROM files
      WHERE hash IN (
        SELECT hash FROM files
        WHERE hash IS NOT NULL
        GROUP BY hash
        HAVING COUNT(*) > 1
      )
    `),
    pool.query(`
      SELECT source_service, COUNT(*) as total_files, COALESCE(SUM(size_bytes), 0) as total_size
      FROM files
      WHERE source_service IS NOT NULL
      GROUP BY source_service
      ORDER BY total_size DESC
    `)
  ]);

  const totalFiles = parseInt(totalResult.rows[0].total_files, 10);
  const totalStorage = formatBytes(parseInt(totalResult.rows[0].total_size, 10));
  const duplicates = parseInt(duplicatesResult.rows[0].duplicate_count, 10);

  const byService = byServiceResult.rows.map((row) => ({
    service: row.source_service,
    files: parseInt(row.total_files, 10),
    size: formatBytes(parseInt(row.total_size, 10))
  }));

  return {
    totalFiles,
    totalStorage,
    duplicates,
    byService
  };
}

// Folders
export async function listFolders(): Promise<string[]> {
  const result = await pool.query(`
    SELECT DISTINCT folder_path
    FROM files
    ORDER BY folder_path ASC
  `);
  return result.rows.map(row => row.folder_path);
}

export async function getFilesByFolder(folderPath: string = '/'): Promise<FileRecord[]> {
  const result = await pool.query(
    'SELECT * FROM files WHERE folder_path = $1 ORDER BY uploaded_at DESC',
    [folderPath]
  );
  return result.rows;
}

export async function moveFileToFolder(fileId: number, folderPath: string): Promise<FileRecord | null> {
  const result = await pool.query(
    'UPDATE files SET folder_path = $1 WHERE id = $2 RETURNING *',
    [folderPath, fileId]
  );
  return result.rows[0] || null;
}

export async function createFolder(folderPath: string): Promise<{ path: string }> {
  // Folders are virtual - they exist only through the folder_path column
  // We just validate and return the path
  if (!folderPath.startsWith('/')) {
    throw new Error('Folder path must start with /');
  }
  return { path: folderPath };
}

export async function deleteFolder(folderPath: string): Promise<number> {
  // Delete all files in the folder
  const result = await pool.query('DELETE FROM files WHERE folder_path = $1', [folderPath]);
  return result.rowCount || 0;
}

// File Versioning
export async function createFileVersion(
  fileId: number,
  versionNumber: number,
  filename: string,
  path: string,
  sha256: string,
  sizeBytes: number,
  changeNotes?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO file_versions (file_id, version_number, filename, path, sha256, size_bytes, change_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [fileId, versionNumber, filename, path, sha256, sizeBytes, changeNotes || null]
  );
}

export async function getFileVersions(fileId: number): Promise<any[]> {
  const result = await pool.query(
    'SELECT * FROM file_versions WHERE file_id = $1 ORDER BY version_number DESC',
    [fileId]
  );
  return result.rows;
}

export async function getLatestVersionNumber(fileId: number): Promise<number> {
  const result = await pool.query(
    'SELECT MAX(version_number) as max_version FROM file_versions WHERE file_id = $1',
    [fileId]
  );
  return result.rows[0]?.max_version || 0;
}

export async function rollbackToVersion(fileId: number, versionNumber: number): Promise<FileRecord | null> {
  // Get the version
  const versionResult = await pool.query(
    'SELECT * FROM file_versions WHERE file_id = $1 AND version_number = $2',
    [fileId, versionNumber]
  );

  if (versionResult.rows.length === 0) {
    return null;
  }

  const version = versionResult.rows[0];

  // Update the current file to match the version
  const updateResult = await pool.query(
    `UPDATE files
     SET filename = $1, path = $2, hash = $3, size_bytes = $4
     WHERE id = $5
     RETURNING *`,
    [version.filename, version.path, version.sha256, version.size_bytes, fileId]
  );

  return updateResult.rows[0] || null;
}

// Utilities
export async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export { pool };
