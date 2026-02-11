import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './services/database';
import campaignRoutes, { trackRoute } from './routes/campaign-routes';

// DeepKit Fabric: shared auth, logging, metrics, event bus
const fabric = require('deepkit-fabric');
const { DeepKitEventBus, deepkitAuth, structuredLogger, metricsMiddleware, metricsEndpoint, healthEndpoint } = fabric;

const app = express();
const PORT = parseInt(process.env.PORT || '3007', 10);

// Event Bus
export const eventBus = new DeepKitEventBus('utm-tracker');

// Middleware stack
app.use(structuredLogger);
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(deepkitAuth);

// Prometheus metrics
app.get('/metrics', metricsEndpoint);

// Health check (enriched)
app.get('/health', healthEndpoint({
  dependencies: [
    { name: 'database', check: async () => { try { const { pool } = require('./services/database'); await pool.query('SELECT 1'); return true; } catch { return false; } } },
    { name: 'event_bus', check: async () => !!eventBus }
  ]
}));

// API routes
app.use('/api/campaigns', campaignRoutes);

// Track route (redirect with tracking)
app.get('/track/:campaignId', trackRoute);

const startServer = async () => {
  try {
    await eventBus.connect();
    await initializeDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`UTM Tracker running on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`Metrics: http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
