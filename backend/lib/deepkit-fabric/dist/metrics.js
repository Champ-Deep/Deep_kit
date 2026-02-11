"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsMiddleware = metricsMiddleware;
exports.metricsEndpoint = metricsEndpoint;
const prom_client_1 = __importDefault(require("prom-client"));
// Collect default Node.js metrics (memory, CPU, event loop)
const collectDefaultMetrics = prom_client_1.default.collectDefaultMetrics;
collectDefaultMetrics({
    prefix: 'deepkit_',
    labels: { service: process.env.SERVICE_NAME || 'unknown' },
});
// HTTP request counter
const httpRequestsTotal = new prom_client_1.default.Counter({
    name: 'deepkit_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'],
});
// HTTP request duration histogram
const httpRequestDuration = new prom_client_1.default.Histogram({
    name: 'deepkit_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'path', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
/**
 * Express middleware to collect HTTP metrics.
 * Tracks request count and duration per method/path/status.
 */
function metricsMiddleware(req, res, next) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const durationNs = Number(process.hrtime.bigint() - start);
        const durationSec = durationNs / 1e9;
        // Normalize path to avoid high cardinality (strip IDs)
        const normalizedPath = req.route?.path || req.path.replace(/\/[0-9a-f-]{8,}/g, '/:id');
        const labels = {
            method: req.method,
            path: normalizedPath,
            status: String(res.statusCode),
        };
        httpRequestsTotal.inc(labels);
        httpRequestDuration.observe(labels, durationSec);
    });
    next();
}
/**
 * Express route handler for /metrics endpoint.
 * Returns Prometheus-compatible text format.
 */
async function metricsEndpoint(_req, res) {
    res.set('Content-Type', prom_client_1.default.register.contentType);
    const metrics = await prom_client_1.default.register.metrics();
    res.send(metrics);
}
