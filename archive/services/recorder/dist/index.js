"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const recordings_1 = require("./routes/recordings");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3006;
// Middleware
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for local development
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'deepkit-recorder',
        timestamp: new Date().toISOString()
    });
});
// API routes
app.use('/api/recordings', recordings_1.recordingsRouter);
// Serve static frontend
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🎥 DEEPKIT_RECORDER running on port ${PORT}`);
    console.log(`📁 Recordings will be saved to: ~/DeepKit/Recordings`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
//# sourceMappingURL=index.js.map