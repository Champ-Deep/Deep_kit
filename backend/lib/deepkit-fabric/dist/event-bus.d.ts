export interface DeepKitEvent {
    source: string;
    timestamp: string;
    correlationId: string;
    event: string;
    payload: Record<string, unknown>;
}
/**
 * DeepKit Event Bus - Redis Pub/Sub for inter-service communication.
 * Unified TypeScript implementation extracted from:
 *   - services/hub/src/lib/event-bus.js (CommonJS)
 *   - services/task-tracker/src/services/event-service.ts (ESM)
 */
export declare class DeepKitEventBus {
    private serviceName;
    private redisUrl;
    private publisher;
    private subscriber;
    constructor(serviceName: string, redisUrl?: string);
    connect(): Promise<boolean>;
    publish(event: string, payload: Record<string, unknown>, correlationId?: string): Promise<void>;
    subscribe(eventPattern: string, callback: (event: DeepKitEvent, channel: string) => void): Promise<void>;
    disconnect(): Promise<void>;
}
