import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './services/database';
import apiRoutes from './routes/api-routes';

// DeepKit Fabric: shared auth, logging, metrics, event bus
const fabric = require('deepkit-fabric');
const { DeepKitEventBus, deepkitAuth, structuredLogger, metricsMiddleware, metricsEndpoint, healthEndpoint } = fabric;

const app = express();
const PORT = parseInt(process.env.PORT || '7718', 10);

// Event Bus (shared fabric library)
export const eventBus = new DeepKitEventBus('task-tracker');

// Middleware stack: logging -> metrics -> CORS -> JSON -> auth
app.use(structuredLogger);
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(deepkitAuth);

// Prometheus metrics endpoint
app.get('/metrics', metricsEndpoint);

// Health check (enriched via fabric)
app.get('/health', healthEndpoint({
  dependencies: [
    {
      name: 'database',
      check: async () => {
        const { pool } = require('./services/database');
        try { await pool.query('SELECT 1'); return true; } catch { return false; }
      }
    },
    {
      name: 'event_bus',
      check: async () => !!eventBus
    }
  ]
}));

// API routes
app.use('/api', apiRoutes);

// Initialize database and start server
async function start() {
  try {
    // Initialize Event Bus
    await eventBus.connect();

    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎮 Gamified Task Tracker running on port ${PORT}`);
      console.log(`🔗 API: http://localhost:${PORT}`);
      console.log(`❤️  Health: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
