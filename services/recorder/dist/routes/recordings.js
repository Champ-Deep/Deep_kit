"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordingsRouter = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const crypto_1 = __importDefault(require("crypto"));
exports.recordingsRouter = express_1.default.Router();
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        const project = req.body.project || 'default';
        const recordingsDir = path_1.default.join(os_1.default.homedir(), 'DeepKit', 'Recordings', project);
        try {
            await promises_1.default.mkdir(recordingsDir, { recursive: true });
            cb(null, recordingsDir);
        }
        catch (error) {
            cb(error, recordingsDir);
        }
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `recording-${timestamp}.webm`;
        cb(null, filename);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only webm files
        if (file.mimetype === 'video/webm' || file.originalname.endsWith('.webm')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only .webm files are allowed'));
        }
    }
});
// POST /api/recordings/upload - Upload a recording
exports.recordingsRouter.post('/upload', upload.single('recording'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Parse request body
        const { project = 'default', notes = '', tags = '[]', duration = 0, annotations = '[]' } = req.body;
        // Get file stats
        const stats = await promises_1.default.stat(req.file.path);
        // Create metadata object
        const metadata = {
            id: crypto_1.default.randomUUID(),
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
        await promises_1.default.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        res.json({
            success: true,
            id: metadata.id,
            filename: req.file.filename,
            path: req.file.path,
            size: stats.size
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Failed to save recording',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/recordings - List all recordings
exports.recordingsRouter.get('/', async (req, res) => {
    try {
        const { project } = req.query;
        const recordingsBase = path_1.default.join(os_1.default.homedir(), 'DeepKit', 'Recordings');
        // If project specified, list that project's recordings
        if (project) {
            const projectDir = path_1.default.join(recordingsBase, project);
            try {
                const files = await promises_1.default.readdir(projectDir);
                const recordings = files
                    .filter(f => f.endsWith('.webm'))
                    .map(f => f.replace('.webm', ''));
                return res.json({ project, recordings });
            }
            catch (error) {
                return res.json({ project, recordings: [] });
            }
        }
        // Otherwise, list all projects
        try {
            const projects = await promises_1.default.readdir(recordingsBase);
            const projectDirs = [];
            for (const dir of projects) {
                const stats = await promises_1.default.stat(path_1.default.join(recordingsBase, dir));
                if (stats.isDirectory()) {
                    projectDirs.push(dir);
                }
            }
            res.json({ projects: projectDirs });
        }
        catch (error) {
            res.json({ projects: [] });
        }
    }
    catch (error) {
        console.error('List error:', error);
        res.status(500).json({
            error: 'Failed to list recordings',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/recordings/:project/:id - Get recording metadata
exports.recordingsRouter.get('/:project/:id', async (req, res) => {
    try {
        const { project, id } = req.params;
        const metadataPath = path_1.default.join(os_1.default.homedir(), 'DeepKit', 'Recordings', project, `${id}.meta.json`);
        const content = await promises_1.default.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(content);
        res.json(metadata);
    }
    catch (error) {
        console.error('Get metadata error:', error);
        res.status(404).json({
            error: 'Recording not found',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// DELETE /api/recordings/:project/:id - Delete a recording
exports.recordingsRouter.delete('/:project/:id', async (req, res) => {
    try {
        const { project, id } = req.params;
        const basePath = path_1.default.join(os_1.default.homedir(), 'DeepKit', 'Recordings', project, id);
        const webmPath = `${basePath}.webm`;
        const metaPath = `${basePath}.meta.json`;
        // Delete both files
        await Promise.all([
            promises_1.default.unlink(webmPath),
            promises_1.default.unlink(metaPath)
        ]);
        res.json({ success: true, message: 'Recording deleted' });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            error: 'Failed to delete recording',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=recordings.js.map