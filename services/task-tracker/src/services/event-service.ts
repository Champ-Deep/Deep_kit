import { createClient, RedisClientType } from 'redis';

class DeepKitEventBus {
    private serviceName: string;
    private redisUrl: string;
    private publisher: RedisClientType | null = null;
    private subscriber: RedisClientType | null = null;
    private isConnected: boolean = false;

    constructor(serviceName: string, redisUrl: string = 'redis://deepkit-cache:6379') {
        this.serviceName = serviceName;
        this.redisUrl = redisUrl;
    }

    async connect(): Promise<boolean> {
        if (this.isConnected) return true;

        try {
            this.publisher = createClient({ url: this.redisUrl });
            this.subscriber = createClient({ url: this.redisUrl });

            this.publisher.on('error', (err) => console.error(`[${this.serviceName}] Redis Publisher Error:`, err));
            this.subscriber.on('error', (err) => console.error(`[${this.serviceName}] Redis Subscriber Error:`, err));

            await this.publisher.connect();
            await this.subscriber.connect();

            this.isConnected = true;
            console.log(`[${this.serviceName}] 🔌 Connected to DeepKit Event Bus`);
            return true;
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to connect to Event Bus:`, error);
            return false;
        }
    }

    async publish(event: string, payload: any): Promise<void> {
        if (!this.publisher || !this.isConnected) {
            console.warn(`[${this.serviceName}] EventBus not connected, skipping publish: ${event}`);
            return;
        }
        
        const message = JSON.stringify({
            source: this.serviceName,
            timestamp: new Date().toISOString(),
            event,
            payload
        });

        // Publish to specific event channel
        await this.publisher.publish(`DEEPKIT:${event}`, message);
        
        // Also publish to global firehose for logging/monitoring
        await this.publisher.publish('DEEPKIT:FIREHOSE', message);
        
        console.log(`[${this.serviceName}] 📢 Published: ${event}`);
    }
}

// Singleton instance
export const eventBus = new DeepKitEventBus('task-tracker');
