import { Request, Response, NextFunction } from 'express';
/**
 * Express middleware to collect HTTP metrics.
 * Tracks request count and duration per method/path/status.
 */
export declare function metricsMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Express route handler for /metrics endpoint.
 * Returns Prometheus-compatible text format.
 */
export declare function metricsEndpoint(_req: Request, res: Response): Promise<void>;
