// DeepKit Fabric - Shared service infrastructure
// "The connective tissue of the Arsenal."

export { deepkitAuth } from './auth-middleware';
export { structuredLogger, log } from './logger';
export type { LogEntry } from './logger';
export { metricsMiddleware, metricsEndpoint } from './metrics';
export { DeepKitEventBus } from './event-bus';
export type { DeepKitEvent } from './event-bus';
export { healthEndpoint } from './health';
export * as Events from './events';
