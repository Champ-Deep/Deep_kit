import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import * as db from '../services/database';
import * as pgBrowser from '../services/postgres-browser';
import * as redisBrowser from '../services/redis-browser';

const router = Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Files
router.get('/files', async (req: Request, res: Response) => {
  try {
    const { source_service, search } = req.query;
    const files = await db.getFiles(
      source_service as string | undefined,
      search as string | undefined
    );
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

router.get('/files/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const file = await db.getFileById(id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(file);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

router.post('/files/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const hash = await db.calculateFileHash(req.file.path);

    const fileRecord = await db.createFile({
      filename: req.file.filename,
      original_filename: req.file.originalname,
      path: req.file.path,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      source_service: req.body.source_service || 'file-manager',
      uploaded_by: req.body.uploaded_by || null,
      hash
    });

    // Generate thumbnail for images
    if (req.file.mimetype.startsWith('image/')) {
      try {
        const thumbPath = path.join(path.dirname(req.file.path), 'thumb-' + req.file.filename);
        await sharp(req.file.path)
          .resize(200, 200, { fit: 'cover' })
          .toFile(thumbPath);
      } catch (error) {
        console.error('Error generating thumbnail:', error);
      }
    }

    res.status(201).json(fileRecord);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.get('/files/:id/download', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const file = await db.getFileById(id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(file.path, file.original_filename || file.filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

router.get('/files/:id/preview', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const file = await db.getFileById(id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const thumbPath = path.join(path.dirname(file.path), 'thumb-' + file.filename);

    if (fs.existsSync(thumbPath)) {
      res.sendFile(thumbPath);
    } else if (file.mime_type?.startsWith('image/') && fs.existsSync(file.path)) {
      res.sendFile(file.path);
    } else {
      res.status(404).json({ error: 'Preview not available' });
    }
  } catch (error) {
    console.error('Error getting preview:', error);
    res.status(500).json({ error: 'Failed to get preview' });
  }
});

router.delete('/files/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const file = await db.deleteFile(id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Delete thumbnail if exists
    const thumbPath = path.join(path.dirname(file.path), 'thumb-' + file.filename);
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

router.post('/files/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }

    // Get file paths before deletion
    const files = await Promise.all(ids.map(id => db.getFileById(id)));

    // Delete from database
    const deleted = await db.bulkDeleteFiles(ids);

    // Delete files from disk
    for (const file of files) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        const thumbPath = path.join(path.dirname(file.path), 'thumb-' + file.filename);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      }
    }

    res.json({ deleted });
  } catch (error) {
    console.error('Error bulk deleting files:', error);
    res.status(500).json({ error: 'Failed to bulk delete files' });
  }
});

// Duplicates
router.get('/duplicates', async (req: Request, res: Response) => {
  try {
    const duplicates = await db.getDuplicates();
    res.json(duplicates);
  } catch (error) {
    console.error('Error finding duplicates:', error);
    res.status(500).json({ error: 'Failed to find duplicates' });
  }
});

// Storage Analytics
router.get('/storage/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await db.getStorageAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching storage analytics:', error);
    res.status(500).json({ error: 'Failed to fetch storage analytics' });
  }
});

router.post('/storage/sync', async (req: Request, res: Response) => {
  try {
    await db.syncStorageAnalytics();
    const analytics = await db.getStorageAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error syncing storage analytics:', error);
    res.status(500).json({ error: 'Failed to sync storage analytics' });
  }
});

// Stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================================================
// PostgreSQL Browser
// ============================================================================

// List all databases
router.get('/postgres/databases', async (req: Request, res: Response) => {
  try {
    const databases = await pgBrowser.listDatabases();
    res.json(databases);
  } catch (error) {
    console.error('Error listing databases:', error);
    res.status(500).json({ error: 'Failed to list databases' });
  }
});

// List tables in a database
router.get('/postgres/databases/:database/tables', async (req: Request, res: Response) => {
  try {
    const { database } = req.params;
    const tables = await pgBrowser.listTables(database);
    res.json(tables);
  } catch (error) {
    console.error('Error listing tables:', error);
    res.status(500).json({ error: 'Failed to list tables' });
  }
});

// Get table schema
router.get('/postgres/databases/:database/tables/:table/schema', async (req: Request, res: Response) => {
  try {
    const { database, table } = req.params;
    const schema = await pgBrowser.getTableSchema(database, table);
    res.json(schema);
  } catch (error) {
    console.error('Error getting table schema:', error);
    res.status(500).json({ error: 'Failed to get table schema' });
  }
});

// Browse table data
router.get('/postgres/databases/:database/tables/:table/data', async (req: Request, res: Response) => {
  try {
    const { database, table } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 100;
    const data = await pgBrowser.browseTableData(database, table, page, pageSize);
    res.json(data);
  } catch (error) {
    console.error('Error browsing table data:', error);
    res.status(500).json({ error: 'Failed to browse table data' });
  }
});

// Execute query (SELECT only)
router.post('/postgres/databases/:database/query', async (req: Request, res: Response) => {
  try {
    const { database } = req.params;
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await pgBrowser.executeQuery(database, query);
    res.json(result);
  } catch (error: any) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: error.message || 'Failed to execute query' });
  }
});

// ============================================================================
// Redis Browser
// ============================================================================

// Get Redis info
router.get('/redis/info', async (req: Request, res: Response) => {
  try {
    const info = await redisBrowser.getRedisInfo();
    res.json(info);
  } catch (error) {
    console.error('Error getting Redis info:', error);
    res.status(500).json({ error: 'Failed to get Redis info' });
  }
});

// Scan keys with pagination
router.get('/redis/keys', async (req: Request, res: Response) => {
  try {
    const pattern = (req.query.pattern as string) || '*';
    const cursor = parseInt(req.query.cursor as string) || 0;
    const count = parseInt(req.query.count as string) || 100;
    const result = await redisBrowser.scanKeys(pattern, cursor, count);
    res.json(result);
  } catch (error) {
    console.error('Error scanning keys:', error);
    res.status(500).json({ error: 'Failed to scan keys' });
  }
});

// Search keys by pattern
router.get('/redis/search', async (req: Request, res: Response) => {
  try {
    const pattern = (req.query.pattern as string) || '*';
    const limit = parseInt(req.query.limit as string) || 100;
    const keys = await redisBrowser.searchKeys(pattern, limit);
    res.json(keys);
  } catch (error) {
    console.error('Error searching keys:', error);
    res.status(500).json({ error: 'Failed to search keys' });
  }
});

// Get key value
router.get('/redis/keys/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const value = await redisBrowser.getKeyValue(decodeURIComponent(key));
    if (!value) {
      return res.status(404).json({ error: 'Key not found' });
    }
    res.json(value);
  } catch (error) {
    console.error('Error getting key value:', error);
    res.status(500).json({ error: 'Failed to get key value' });
  }
});

// Delete key
router.delete('/redis/keys/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const deleted = await redisBrowser.deleteKey(decodeURIComponent(key));
    if (!deleted) {
      return res.status(404).json({ error: 'Key not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting key:', error);
    res.status(500).json({ error: 'Failed to delete key' });
  }
});

// Delete multiple keys
router.post('/redis/keys/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Invalid keys array' });
    }
    const deleted = await redisBrowser.deleteKeys(keys);
    res.json({ deleted });
  } catch (error) {
    console.error('Error bulk deleting keys:', error);
    res.status(500).json({ error: 'Failed to bulk delete keys' });
  }
});

// ============================================================================
// Folders
// ============================================================================

// List all folders
router.get('/folders', async (req: Request, res: Response) => {
  try {
    const folders = await db.listFolders();
    res.json(folders);
  } catch (error) {
    console.error('Error listing folders:', error);
    res.status(500).json({ error: 'Failed to list folders' });
  }
});

// Get files in a folder
router.get('/folders/*', async (req: Request, res: Response) => {
  try {
    const folderPath = '/' + (req.params[0] || '');
    const files = await db.getFilesByFolder(folderPath);
    res.json(files);
  } catch (error) {
    console.error('Error getting folder files:', error);
    res.status(500).json({ error: 'Failed to get folder files' });
  }
});

// Create folder
router.post('/folders', async (req: Request, res: Response) => {
  try {
    const { path: folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }
    const folder = await db.createFolder(folderPath);
    res.status(201).json(folder);
  } catch (error: any) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: error.message || 'Failed to create folder' });
  }
});

// Move file to folder
router.put('/files/:id/move', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { folder_path } = req.body;
    if (!folder_path) {
      return res.status(400).json({ error: 'Folder path is required' });
    }
    const file = await db.moveFileToFolder(id, folder_path);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(file);
  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({ error: 'Failed to move file' });
  }
});

// Delete folder
router.delete('/folders/*', async (req: Request, res: Response) => {
  try {
    const folderPath = '/' + (req.params[0] || '');
    const deleted = await db.deleteFolder(folderPath);
    res.json({ deleted });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// ============================================================================
// File Versioning
// ============================================================================

// Get file versions
router.get('/files/:id/versions', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const versions = await db.getFileVersions(id);
    res.json(versions);
  } catch (error) {
    console.error('Error getting file versions:', error);
    res.status(500).json({ error: 'Failed to get file versions' });
  }
});

// Create file version (when uploading same file)
router.post('/files/:id/versions', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { filename, path: filePath, sha256, size_bytes, change_notes } = req.body;

    // Get current version number
    const currentVersion = await db.getLatestVersionNumber(id);
    const newVersion = currentVersion + 1;

    await db.createFileVersion(id, newVersion, filename, filePath, sha256, size_bytes, change_notes);
    res.status(201).json({ version: newVersion });
  } catch (error) {
    console.error('Error creating file version:', error);
    res.status(500).json({ error: 'Failed to create file version' });
  }
});

// Rollback to version
router.post('/files/:id/versions/:version/rollback', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const version = parseInt(req.params.version, 10);

    const file = await db.rollbackToVersion(id, version);
    if (!file) {
      return res.status(404).json({ error: 'File or version not found' });
    }

    res.json(file);
  } catch (error) {
    console.error('Error rolling back file:', error);
    res.status(500).json({ error: 'Failed to rollback file' });
  }
});

export default router;
