"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepKitEventBus = void 0;
const redis_1 = require("redis");
const uuid_1 = require("uuid");
const logger_1 = require("./logger");
/**
 * DeepKit Event Bus - Redis Pub/Sub for inter-service communication.
 * Unified TypeScript implementation extracted from:
 *   - services/hub/src/lib/event-bus.js (CommonJS)
 *   - services/task-tracker/src/services/event-service.ts (ESM)
 */
class DeepKitEventBus {
    constructor(serviceName, redisUrl) {
        this.publisher = null;
        this.subscriber = null;
        this.serviceName = serviceName;
        // Support REDIS_PASSWORD in the URL
        const password = process.env.REDIS_PASSWORD;
        const host = process.env.REDIS_HOST || 'deepkit-cache';
        const port = process.env.REDIS_PORT || '6379';
        if (redisUrl) {
            this.redisUrl = redisUrl;
        }
        else if (password) {
            this.redisUrl = `redis://:${password}@${host}:${port}`;
        }
        else {
            this.redisUrl = `redis://${host}:${port}`;
        }
    }
    async connect() {
        try {
            this.publisher = (0, redis_1.createClient)({ url: this.redisUrl });
            this.subscriber = (0, redis_1.createClient)({ url: this.redisUrl });
            this.publisher.on('error', (err) => (0, logger_1.log)('error', `Redis Publisher Error`, { correlationId: 'event-bus', error: String(err) }));
            this.subscriber.on('error', (err) => (0, logger_1.log)('error', `Redis Subscriber Error`, { correlationId: 'event-bus', error: String(err) }));
            await this.publisher.connect();
            await this.subscriber.connect();
            (0, logger_1.log)('info', `Connected to DeepKit Event Bus`, { correlationId: 'event-bus' });
            return true;
        }
        catch (error) {
            (0, logger_1.log)('error', `Failed to connect to Event Bus`, {
                correlationId: 'event-bus',
                error: String(error),
            });
            return false;
        }
    }
    async publish(event, payload, correlationId) {
        if (!this.publisher) {
            throw new Error('EventBus not connected');
        }
        const message = {
            source: this.serviceName,
            timestamp: new Date().toISOString(),
            correlationId: correlationId || (0, uuid_1.v4)(),
            event,
            payload,
        };
        const serialized = JSON.stringify(message);
        // Publish to specific event channel
        await this.publisher.publish(`DEEPKIT:${event}`, serialized);
        // Also publish to global firehose for logging/monitoring
        await this.publisher.publish('DEEPKIT:FIREHOSE', serialized);
        (0, logger_1.log)('info', `Published: ${event}`, { correlationId: message.correlationId });
    }
    async subscribe(eventPattern, callback) {
        if (!this.subscriber) {
            throw new Error('EventBus not connected');
        }
        await this.subscriber.pSubscribe(`DEEPKIT:${eventPattern}`, (message, channel) => {
            try {
                const parsed = JSON.parse(message);
                callback(parsed, channel);
            }
            catch (err) {
                (0, logger_1.log)('error', `Error processing message on ${channel}`, {
                    correlationId: 'event-bus',
                    error: String(err),
                });
            }
        });
        (0, logger_1.log)('info', `Subscribed to: DEEPKIT:${eventPattern}`, { correlationId: 'event-bus' });
    }
    async disconnect() {
        if (this.publisher)
            await this.publisher.disconnect();
        if (this.subscriber)
            await this.subscriber.disconnect();
        (0, logger_1.log)('info', `Disconnected from Event Bus`, { correlationId: 'event-bus' });
    }
}
exports.DeepKitEventBus = DeepKitEventBus;
