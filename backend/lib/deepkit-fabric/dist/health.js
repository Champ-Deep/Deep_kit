"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthEndpoint = healthEndpoint;
const startTime = Date.now();
/**
 * Unified health check endpoint factory.
 * Returns an Express handler that checks all registered dependencies.
 *
 * Usage:
 *   app.get('/health', healthEndpoint({
 *     dependencies: [
 *       { name: 'database', check: async () => { await pool.query('SELECT 1'); return true; } },
 *       { name: 'redis', check: async () => { await redis.ping(); return true; } },
 *     ]
 *   }));
 */
function healthEndpoint(opts) {
    const serviceName = process.env.SERVICE_NAME || 'unknown';
    const version = process.env.SERVICE_VERSION || '1.0.0';
    const dependencies = opts?.dependencies || [];
    return async (_req, res) => {
        const checks = {};
        let allHealthy = true;
        for (const dep of dependencies) {
            const start = Date.now();
            try {
                const ok = await dep.check();
                const latency = Date.now() - start;
                checks[dep.name] = { status: ok ? 'up' : 'down', latency_ms: latency };
                if (!ok)
                    allHealthy = false;
            }
            catch {
                const latency = Date.now() - start;
                checks[dep.name] = { status: 'down', latency_ms: latency };
                allHealthy = false;
            }
        }
        const response = {
            status: allHealthy ? 'healthy' : dependencies.length > 0 ? 'degraded' : 'healthy',
            service: serviceName,
            version,
            timestamp: new Date().toISOString(),
            uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
            checks,
        };
        res.status(allHealthy ? 200 : 503).json(response);
    };
}
