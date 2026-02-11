import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { log } from './logger';

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
export class DeepKitEventBus {
  private serviceName: string;
  private redisUrl: string;
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;

  constructor(serviceName: string, redisUrl?: string) {
    this.serviceName = serviceName;
    // Support REDIS_PASSWORD in the URL
    const password = process.env.REDIS_PASSWORD;
    const host = process.env.REDIS_HOST || 'deepkit-cache';
    const port = process.env.REDIS_PORT || '6379';

    if (redisUrl) {
      this.redisUrl = redisUrl;
    } else if (password) {
      this.redisUrl = `redis://:${password}@${host}:${port}`;
    } else {
      this.redisUrl = `redis://${host}:${port}`;
    }
  }

  async connect(): Promise<boolean> {
    try {
      this.publisher = createClient({ url: this.redisUrl }) as RedisClientType;
      this.subscriber = createClient({ url: this.redisUrl }) as RedisClientType;

      this.publisher.on('error', (err) =>
        log('error', `Redis Publisher Error`, { correlationId: 'event-bus', error: String(err) })
      );
      this.subscriber.on('error', (err) =>
        log('error', `Redis Subscriber Error`, { correlationId: 'event-bus', error: String(err) })
      );

      await this.publisher.connect();
      await this.subscriber.connect();

      log('info', `Connected to DeepKit Event Bus`, { correlationId: 'event-bus' });
      return true;
    } catch (error) {
      log('error', `Failed to connect to Event Bus`, {
        correlationId: 'event-bus',
        error: String(error),
      });
      return false;
    }
  }

  async publish(event: string, payload: Record<string, unknown>, correlationId?: string): Promise<void> {
    if (!this.publisher) {
      throw new Error('EventBus not connected');
    }

    const message: DeepKitEvent = {
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      correlationId: correlationId || uuidv4(),
      event,
      payload,
    };

    const serialized = JSON.stringify(message);

    // Publish to specific event channel
    await this.publisher.publish(`DEEPKIT:${event}`, serialized);

    // Also publish to global firehose for logging/monitoring
    await this.publisher.publish('DEEPKIT:FIREHOSE', serialized);

    log('info', `Published: ${event}`, { correlationId: message.correlationId });
  }

  async subscribe(
    eventPattern: string,
    callback: (event: DeepKitEvent, channel: string) => void
  ): Promise<void> {
    if (!this.subscriber) {
      throw new Error('EventBus not connected');
    }

    await this.subscriber.pSubscribe(`DEEPKIT:${eventPattern}`, (message, channel) => {
      try {
        const parsed: DeepKitEvent = JSON.parse(message);
        callback(parsed, channel);
      } catch (err) {
        log('error', `Error processing message on ${channel}`, {
          correlationId: 'event-bus',
          error: String(err),
        });
      }
    });

    log('info', `Subscribed to: DEEPKIT:${eventPattern}`, { correlationId: 'event-bus' });
  }

  async disconnect(): Promise<void> {
    if (this.publisher) await this.publisher.disconnect();
    if (this.subscriber) await this.subscriber.disconnect();
    log('info', `Disconnected from Event Bus`, { correlationId: 'event-bus' });
  }
}
