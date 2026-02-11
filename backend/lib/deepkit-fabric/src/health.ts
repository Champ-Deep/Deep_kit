import { Request, Response } from 'express';

interface HealthCheckDependency {
  name: string;
  check: () => Promise<boolean>;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptime_seconds: number;
  checks: Record<string, { status: 'up' | 'down'; latency_ms: number }>;
}

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
export function healthEndpoint(opts?: {
  dependencies?: HealthCheckDependency[];
}): (req: Request, res: Response) => Promise<void> {
  const serviceName = process.env.SERVICE_NAME || 'unknown';
  const version = process.env.SERVICE_VERSION || '1.0.0';
  const dependencies = opts?.dependencies || [];

  return async (_req: Request, res: Response) => {
    const checks: HealthResponse['checks'] = {};
    let allHealthy = true;

    for (const dep of dependencies) {
      const start = Date.now();
      try {
        const ok = await dep.check();
        const latency = Date.now() - start;
        checks[dep.name] = { status: ok ? 'up' : 'down', latency_ms: latency };
        if (!ok) allHealthy = false;
      } catch {
        const latency = Date.now() - start;
        checks[dep.name] = { status: 'down', latency_ms: latency };
        allHealthy = false;
      }
    }

    const response: HealthResponse = {
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
