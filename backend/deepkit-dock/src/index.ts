import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { scanAllPorts, detectConflicts } from './services/port-scanner';
import { suggestPort, analyzePort } from './services/suggestion-engine';
import { PortSuggestionRequest } from './types';

const fastify = Fastify({ logger: true });

// CORS
fastify.register(fastifyCors, {
  origin: '*'
});

// WebSocket
fastify.register(fastifyWebsocket);

// Static files (frontend will go here)
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
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
    const ports = await scanAllPorts();
    const conflicts = detectConflicts(ports);

    return {
      ports,
      conflicts,
      total: ports.length,
      timestamp: Date.now()
    };
  } catch (error) {
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
    const ports = await scanAllPorts();
    const conflicts = detectConflicts(ports);

    return {
      ports,
      conflicts,
      total: ports.length,
      scannedAt: Date.now()
    };
  } catch (error) {
    reply.status(500);
    return {
      error: 'Scan failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// GET /api/ports/:port - Get specific port details
fastify.get<{ Params: { port: string } }>('/api/ports/:port', async (request, reply) => {
  try {
    const port = parseInt(request.params.port, 10);
    if (isNaN(port) || port < 0 || port > 65535) {
      reply.status(400);
      return { error: 'Invalid port number' };
    }

    const ports = await scanAllPorts();
    const analysis = analyzePort(port, ports);

    return analysis;
  } catch (error) {
    reply.status(500);
    return {
      error: 'Failed to analyze port',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// POST /api/ports/suggest - Smart port suggestion
fastify.post<{ Body: PortSuggestionRequest }>('/api/ports/suggest', async (request, reply) => {
  try {
    const requestBody = request.body as PortSuggestionRequest;

    // Validate request
    if (!requestBody.type || !requestBody.projectId) {
      reply.status(400);
      return { error: 'Missing required fields: type, projectId' };
    }

    const ports = await scanAllPorts();
    const suggestion = await suggestPort(requestBody, ports);

    return suggestion;
  } catch (error) {
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
    const ports = await scanAllPorts();
    const conflicts = detectConflicts(ports);

    return {
      conflicts,
      count: conflicts.length,
      timestamp: Date.now()
    };
  } catch (error) {
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
  scanAllPorts().then(ports => {
    const conflicts = detectConflicts(ports);
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
      const ports = await scanAllPorts();
      const conflicts = detectConflicts(ports);

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
    } catch (error) {
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
