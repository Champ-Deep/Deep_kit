import { Request, Response } from 'express';
interface HealthCheckDependency {
    name: string;
    check: () => Promise<boolean>;
}
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
export declare function healthEndpoint(opts?: {
    dependencies?: HealthCheckDependency[];
}): (req: Request, res: Response) => Promise<void>;
export {};
