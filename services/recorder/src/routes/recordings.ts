import express, { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import crypto from 'crypto';

export const recordingsRouter: Router = express.Router();

// Interface for recording metadata
interface RecordingMetadata {
  id: string;
  filename: string;
  project: string;
  notes?: string;
  tags: string[];
  duration: number;
  annotations: Annotation[];
  timestamp: string;
  fileSize?: number;
}

interface Annotation {
  timestamp: number; // ms from start
  type: 'draw' | 'arrow' | 'text' | 'highlight';
  data: {
    points?: { x: number; y: number }[];
    text?: string;
    from?: { x: number; y: number };
    to?: { x: number; y: number };
    position?: { x: number; y: number };
    radius?: number;
  };
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const project = req.body.project || 'default';
    const recordingsDir = path.join(os.homedir(), 'DeepKit', 'Recordings', project);

    try {
      await fs.mkdir(recordingsDir, { recursive: true });
      cb(null, recordingsDir);
    } catch (error) {
      cb(error as Error, recordingsDir);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${timestamp}.webm`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only webm files
    if (file.mimetype === 'video/webm' || file.originalname.endsWith('.webm')) {
      cb(null, true);
    } else {
      cb(new Error('Only .webm files are allowed'));
    }
  }
});

// POST /api/recordings/upload - Upload a recording
recordingsRouter.post('/upload', upload.single('recording'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse request body
    const {
      project = 'default',
      notes = '',
      tags = '[]',
      duration = 0,
      annotations = '[]'
    } = req.body;

    // Get file stats
    const stats = await fs.stat(req.file.path);

    // Create metadata object
    const metadata: RecordingMetadata = {
      id: crypto.randomUUID(),
      filename: req.file.filename,
      project,
      notes,
      tags: JSON.parse(tags),
      duration: parseInt(duration),
      annotations: JSON.parse(annotations),
      timestamp: new Date().toISOString(),
      fileSize: stats.size
    };

    // Save metadata as sidecar JSON
    const metadataPath = req.file.path.replace('.webm', '.meta.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    res.json({
      success: true,
      id: metadata.id,
      filename: req.file.filename,
      path: req.file.path,
      size: stats.size
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to save recording',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/recordings - List all recordings
recordingsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { project } = req.query;
    const recordingsBase = path.join(os.homedir(), 'DeepKit', 'Recordings');

    // If project specified, list that project's recordings
    if (project) {
      const projectDir = path.join(recordingsBase, project as string);
      try {
        const files = await fs.readdir(projectDir);
        const recordings = files
          .filter(f => f.endsWith('.webm'))
          .map(f => f.replace('.webm', ''));

        return res.json({ project, recordings });
      } catch (error) {
        return res.json({ project, recordings: [] });
      }
    }

    // Otherwise, list all projects
    try {
      const projects = await fs.readdir(recordingsBase);
      const projectDirs = [];

      for (const dir of projects) {
        const stats = await fs.stat(path.join(recordingsBase, dir));
        if (stats.isDirectory()) {
          projectDirs.push(dir);
        }
      }

      res.json({ projects: projectDirs });
    } catch (error) {
      res.json({ projects: [] });
    }

  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({
      error: 'Failed to list recordings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/recordings/:project/:id - Get recording metadata
recordingsRouter.get('/:project/:id', async (req: Request, res: Response) => {
  try {
    const { project, id } = req.params;
    const metadataPath = path.join(
      os.homedir(),
      'DeepKit',
      'Recordings',
      project,
      `${id}.meta.json`
    );

    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);

    res.json(metadata);

  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(404).json({
      error: 'Recording not found',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/recordings/:project/:id - Delete a recording
recordingsRouter.delete('/:project/:id', async (req: Request, res: Response) => {
  try {
    const { project, id } = req.params;
    const basePath = path.join(
      os.homedir(),
      'DeepKit',
      'Recordings',
      project,
      id
    );

    const webmPath = `${basePath}.webm`;
    const metaPath = `${basePath}.meta.json`;

    // Delete both files
    await Promise.all([
      fs.unlink(webmPath),
      fs.unlink(metaPath)
    ]);

    res.json({ success: true, message: 'Recording deleted' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Failed to delete recording',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
