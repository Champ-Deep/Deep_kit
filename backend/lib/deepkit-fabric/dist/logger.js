"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.structuredLogger = structuredLogger;
exports.log = log;
const uuid_1 = require("uuid");
const serviceName = process.env.SERVICE_NAME || 'unknown';
/**
 * Structured JSON logging middleware for Express.
 * Attaches correlation ID to every request and logs request/response pairs.
 */
function structuredLogger(req, res, next) {
    const start = Date.now();
    // Extract or generate correlation ID
    const correlationId = req.headers['x-correlation-id'] || (0, uuid_1.v4)();
    req.headers['x-correlation-id'] = correlationId;
    // Attach to response for downstream propagation
    res.setHeader('X-Correlation-ID', correlationId);
    // Log on response finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        const entry = {
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
function log(level, message, meta) {
    const entry = {
        timestamp: new Date().toISOString(),
        service: serviceName,
        level,
        correlationId: meta?.correlationId || 'system',
        message,
        ...meta,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
}
