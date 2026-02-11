import express from 'express';
import http from 'http';

// DeepKit Fabric: event bus, logging, metrics, health
const fabric = require('deepkit-fabric');
const {
  DeepKitEventBus,
  structuredLogger,
  metricsMiddleware,
  metricsEndpoint,
  healthEndpoint,
  log,
} = fabric;

const app = express();
const PORT = parseInt(process.env.PORT || '7730', 10);

// n8n webhook target
const N8N_HOST = process.env.N8N_HOST || 'deepkit-orchestrator';
const N8N_PORT = parseInt(process.env.N8N_PORT || '5678', 10);
const N8N_WEBHOOK_PATH = process.env.N8N_WEBHOOK_PATH || '/webhook/deepkit-events';

// Optional: comma-separated list of event types to forward (empty = all)
const EVENT_FILTER = process.env.EVENT_FILTER
  ? process.env.EVENT_FILTER.split(',').map((e: string) => e.trim())
  : [];

// Event Bus
const eventBus = new DeepKitEventBus('n8n-bridge');

// Stats
let eventsForwarded = 0;
let eventsFailed = 0;
let lastEventAt: string | null = null;

// Middleware
app.use(structuredLogger);
app.use(metricsMiddleware);

// Prometheus metrics
app.get('/metrics', metricsEndpoint);

// Health check
app.get('/health', healthEndpoint({
  dependencies: [
    { name: 'event_bus', check: async () => !!eventBus },
    {
      name: 'n8n_reachable',
      check: () => new Promise<boolean>((resolve) => {
        const req = http.request(
          { hostname: N8N_HOST, port: N8N_PORT, path: '/healthz', method: 'GET', timeout: 3000 },
          (res) => resolve(res.statusCode === 200)
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
      })
    }
  ]
}));

// Bridge stats endpoint
app.get('/api/stats', (_req, res) => {
  res.json({
    events_forwarded: eventsForwarded,
    events_failed: eventsFailed,
    last_event_at: lastEventAt,
    filter: EVENT_FILTER.length > 0 ? EVENT_FILTER : 'all',
    target: `http://${N8N_HOST}:${N8N_PORT}${N8N_WEBHOOK_PATH}`,
  });
});

/**
 * Forward a DeepKit event to n8n's webhook endpoint.
 */
function forwardToN8n(event: Record<string, unknown>): void {
  const body = JSON.stringify(event);

  const req = http.request(
    {
      hostname: N8N_HOST,
      port: N8N_PORT,
      path: N8N_WEBHOOK_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-DeepKit-Source': 'event-bridge',
        'X-Correlation-ID': (event.correlationId as string) || '',
      },
      timeout: 5000,
    },
    (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        eventsForwarded++;
        lastEventAt = new Date().toISOString();
      } else {
        eventsFailed++;
        log('warn', `n8n returned ${res.statusCode} for event ${event.event}`, {
          correlationId: (event.correlationId as string) || 'bridge',
        });
      }
      // Consume response to free socket
      res.resume();
    }
  );

  req.on('error', (err: Error) => {
    eventsFailed++;
    log('error', `Failed to forward event to n8n: ${err.message}`, {
      correlationId: (event.correlationId as string) || 'bridge',
    });
  });

  req.on('timeout', () => {
    req.destroy();
    eventsFailed++;
  });

  req.write(body);
  req.end();
}

async function start() {
  try {
    const connected = await eventBus.connect();
    if (!connected) {
      log('warn', 'Event bus connection failed — will retry on reconnect', { correlationId: 'bridge-init' });
    }

    // Subscribe to FIREHOSE (all events)
    await eventBus.subscribe('*', (event: Record<string, unknown>, channel: string) => {
      // Apply filter if configured
      if (EVENT_FILTER.length > 0 && !EVENT_FILTER.includes(event.event as string)) {
        return;
      }

      // Skip forwarding our own bridge events to avoid loops
      if (event.source === 'n8n-bridge') {
        return;
      }

      forwardToN8n(event);
    });

    log('info', `Subscribed to DEEPKIT:FIREHOSE → forwarding to http://${N8N_HOST}:${N8N_PORT}${N8N_WEBHOOK_PATH}`, {
      correlationId: 'bridge-init',
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`n8n Event Bridge running on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`Stats: http://localhost:${PORT}/api/stats`);
      console.log(`Target: http://${N8N_HOST}:${N8N_PORT}${N8N_WEBHOOK_PATH}`);
      if (EVENT_FILTER.length > 0) {
        console.log(`Filter: ${EVENT_FILTER.join(', ')}`);
      } else {
        console.log(`Filter: ALL events`);
      }
    });
  } catch (error) {
    console.error('Failed to start n8n bridge:', error);
    process.exit(1);
  }
}

start();
