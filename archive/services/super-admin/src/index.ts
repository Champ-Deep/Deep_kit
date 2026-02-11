import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './routes/api-routes';

// DeepKit Fabric: shared auth, logging, metrics, event bus
const fabric = require('deepkit-fabric');
const { DeepKitEventBus, deepkitAuth, structuredLogger, metricsMiddleware, metricsEndpoint, healthEndpoint } = fabric;

const app = express();
const PORT = parseInt(process.env.PORT || '7722', 10);

// Event Bus
export const eventBus = new DeepKitEventBus('super-admin');

// Middleware stack
app.use(structuredLogger);
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(deepkitAuth);

// Prometheus metrics
app.get('/metrics', metricsEndpoint);

// Health check (enriched)
app.get('/health', healthEndpoint({
  dependencies: [
    { name: 'event_bus', check: async () => !!eventBus }
  ]
}));

// API routes
app.use('/api', apiRoutes);

async function start() {
  try {
    await eventBus.connect();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Super Admin Panel running on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`Metrics: http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
