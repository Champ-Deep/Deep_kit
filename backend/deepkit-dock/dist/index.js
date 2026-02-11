"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const cors_1 = __importDefault(require("@fastify/cors"));
const static_1 = __importDefault(require("@fastify/static"));
const path_1 = __importDefault(require("path"));
const port_scanner_1 = require("./services/port-scanner");
const suggestion_engine_1 = require("./services/suggestion-engine");
const fastify = (0, fastify_1.default)({ logger: true });
// CORS
fastify.register(cors_1.default, {
    origin: '*'
});
// WebSocket
fastify.register(websocket_1.default);
// Static files (frontend will go here)
fastify.register(static_1.default, {
    root: path_1.default.join(__dirname, '../public'),
    prefix: '/'
});
// Health check
fastify.get('/health', async (request, reply) => {
    return {
        status: 'healthy',
        service: 'deepkit-dock',
        timestamp: new Date().toISOString()
    };
});
// ===================================================================
// PORT API ENDPOINTS
// ===================================================================
// GET /api/ports/list - Get all ports
fastify.get('/api/ports/list', async (request, reply) => {
    try {
        const ports = await (0, port_scanner_1.scanAllPorts)();
        const conflicts = (0, port_scanner_1.detectConflicts)(ports);
        return {
            ports,
            conflicts,
            total: ports.length,
            timestamp: Date.now()
        };
    }
    catch (error) {
        reply.status(500);
        return {
            error: 'Failed to scan ports',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
// POST /api/ports/scan - Trigger manual scan
fastify.post('/api/ports/scan', async (request, reply) => {
    try {
        const ports = await (0, port_scanner_1.scanAllPorts)();
        const conflicts = (0, port_scanner_1.detectConflicts)(ports);
        return {
            ports,
            conflicts,
            total: ports.length,
            scannedAt: Date.now()
        };
    }
    catch (error) {
        reply.status(500);
        return {
            error: 'Scan failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
// GET /api/ports/:port - Get specific port details
fastify.get('/api/ports/:port', async (request, reply) => {
    try {
        const port = parseInt(request.params.port, 10);
        if (isNaN(port) || port < 0 || port > 65535) {
            reply.status(400);
            return { error: 'Invalid port number' };
        }
        const ports = await (0, port_scanner_1.scanAllPorts)();
        const analysis = (0, suggestion_engine_1.analyzePort)(port, ports);
        return analysis;
    }
    catch (error) {
        reply.status(500);
        return {
            error: 'Failed to analyze port',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
// POST /api/ports/suggest - Smart port suggestion
fastify.post('/api/ports/suggest', async (request, reply) => {
    try {
        const requestBody = request.body;
        // Validate request
        if (!requestBody.type || !requestBody.projectId) {
            reply.status(400);
            return { error: 'Missing required fields: type, projectId' };
        }
        const ports = await (0, port_scanner_1.scanAllPorts)();
        const suggestion = await (0, suggestion_engine_1.suggestPort)(requestBody, ports);
        return suggestion;
    }
    catch (error) {
        reply.status(500);
        return {
            error: 'Suggestion failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
// GET /api/ports/conflicts - Get all conflicts
fastify.get('/api/ports/conflicts', async (request, reply) => {
    try {
        const ports = await (0, port_scanner_1.scanAllPorts)();
        const conflicts = (0, port_scanner_1.detectConflicts)(ports);
        return {
            conflicts,
            count: conflicts.length,
            timestamp: Date.now()
        };
    }
    catch (error) {
        reply.status(500);
        return {
            error: 'Failed to detect conflicts',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
// ===================================================================
// WEBSOCKET - Real-time port updates
// ===================================================================
fastify.get('/ws/ports', { websocket: true }, (connection, req) => {
    console.log('WebSocket client connected');
    // Send initial port scan
    (0, port_scanner_1.scanAllPorts)().then(ports => {
        const conflicts = (0, port_scanner_1.detectConflicts)(ports);
        connection.socket.send(JSON.stringify({
            type: 'port_update',
            ports,
            conflicts,
            timestamp: Date.now()
        }));
    });
    // Send updates every 3 seconds
    const interval = setInterval(async () => {
        try {
            const ports = await (0, port_scanner_1.scanAllPorts)();
            const conflicts = (0, port_scanner_1.detectConflicts)(ports);
            connection.socket.send(JSON.stringify({
                type: 'port_update',
                ports,
                conflicts,
                timestamp: Date.now()
            }));
            // Emit conflict event if any
            if (conflicts.length > 0) {
                connection.socket.send(JSON.stringify({
                    type: 'conflict_detected',
                    conflicts,
                    timestamp: Date.now()
                }));
            }
        }
        catch (error) {
            console.error('WebSocket update error:', error);
        }
    }, 3000);
    connection.socket.on('close', () => {
        clearInterval(interval);
        console.log('WebSocket client disconnected');
    });
    connection.socket.on('error', (err) => {
        console.error('WebSocket error:', err);
        clearInterval(interval);
    });
});
// ===================================================================
// START SERVER
// ===================================================================
const PORT = parseInt(process.env.PORT || '7778', 10);
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    console.log(`⚓ DEEPKIT_DOCK running on port ${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws/ports`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
});
//# sourceMappingURL=index.js.map