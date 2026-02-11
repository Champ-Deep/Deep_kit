import { Request, Response, NextFunction } from 'express';
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
/**
 * Structured JSON logging middleware for Express.
 * Attaches correlation ID to every request and logs request/response pairs.
 */
export declare function structuredLogger(req: Request, res: Response, next: NextFunction): void;
/**
 * Standalone logger function for non-HTTP contexts (event bus, background jobs).
 */
export declare function log(level: LogEntry['level'], message: string, meta?: Partial<LogEntry>): void;
