import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { recordingsRouter } from './routes/recordings';

// DeepKit Fabric: shared auth, logging, metrics, event bus
const fabric = require('deepkit-fabric');
const { DeepKitEventBus, deepkitAuth, structuredLogger, metricsMiddleware, metricsEndpoint, healthEndpoint } = fabric;

const app: Express = express();
const PORT = process.env.PORT || 3006;

// Event Bus
export const eventBus = new DeepKitEventBus('recorder');

// Middleware stack
app.use(structuredLogger);
app.use(metricsMiddleware);
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.use('/api/recordings', recordingsRouter);

// Serve static frontend
app.use(express.static(path.join(__dirname, '../public')));

async function start() {
  try {
    await eventBus.connect();
    app.listen(PORT, () => {
      console.log(`Recorder running on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`Metrics: http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
