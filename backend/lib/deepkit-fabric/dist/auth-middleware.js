"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepkitAuth = deepkitAuth;
/**
 * Service-to-service authentication middleware.
 * Validates the X-DeepKit-Token header against DEEPKIT_INTERNAL_TOKEN.
 * Health endpoints are exempted to allow monitoring without auth.
 */
const EXEMPT_PATHS = ['/health', '/healthz', '/metrics'];
function deepkitAuth(req, res, next) {
    // Allow health/metrics endpoints without auth for monitoring
    if (EXEMPT_PATHS.some(p => req.path === p || req.path.startsWith(p))) {
        return next();
    }
    const token = req.headers['x-deepkit-token'];
    const expectedToken = process.env.DEEPKIT_INTERNAL_TOKEN;
    // If no token is configured, skip auth (dev mode)
    if (!expectedToken) {
        return next();
    }
    if (!token || token !== expectedToken) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing or invalid X-DeepKit-Token header',
        });
        return;
    }
    next();
}
