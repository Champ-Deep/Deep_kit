import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface LogEntry {
  timestamp: string;
  service: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  correlationId: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  message?: string;
  error?: string;
}

const serviceName = process.env.SERVICE_NAME || 'unknown';

/**
 * Structured JSON logging middleware for Express.
 * Attaches correlation ID to every request and logs request/response pairs.
 */
export function structuredLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Extract or generate correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.headers['x-correlation-id'] = correlationId;

  // Attach to response for downstream propagation
  res.setHeader('X-Correlation-ID', correlationId);

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      service: serviceName,
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    };

    // Output as single-line JSON for Promtail/Loki ingestion
    process.stdout.write(JSON.stringify(entry) + '\n');
  });

  next();
}

/**
 * Standalone logger function for non-HTTP contexts (event bus, background jobs).
 */
export function log(level: LogEntry['level'], message: string, meta?: Partial<LogEntry>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    service: serviceName,
    level,
    correlationId: meta?.correlationId || 'system',
    message,
    ...meta,
  };
  process.stdout.write(JSON.stringify(entry) + '\n');
}
