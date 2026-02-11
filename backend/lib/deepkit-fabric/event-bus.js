const { createClient } = require('redis');

class DeepKitEventBus {
    constructor(serviceName, redisUrl = 'redis://deepkit-cache:6379') {
        this.serviceName = serviceName;
        this.redisUrl = redisUrl;
        this.publisher = null;
        this.subscriber = null;
        this.subscriptions = new Map();
    }

    async connect() {
        try {
            this.publisher = createClient({ url: this.redisUrl });
            this.subscriber = createClient({ url: this.redisUrl });

            this.publisher.on('error', (err) => console.error(`[${this.serviceName}] Redis Publisher Error:`, err));
            this.subscriber.on('error', (err) => console.error(`[${this.serviceName}] Redis Subscriber Error:`, err));

            await this.publisher.connect();
            await this.subscriber.connect();

            console.log(`[${this.serviceName}] 🔌 Connected to DeepKit Event Bus`);
            return true;
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to connect to Event Bus:`, error);
            return false;
        }
    }

    async publish(event, payload) {
        if (!this.publisher) {
            throw new Error('EventBus not connected');
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

    async subscribe(eventPattern, callback) {
        if (!this.subscriber) {
            throw new Error('EventBus not connected');
        }

        // Redis pSubscribe allows wildcards
        await this.subscriber.pSubscribe(`DEEPKIT:${eventPattern}`, (message, channel) => {
            try {
                const parsed = JSON.parse(message);
                callback(parsed, channel);
            } catch (err) {
                console.error(`[${this.serviceName}] Error processing message on ${channel}:`, err);
            }
        });

        console.log(`[${this.serviceName}] 👂 Subscribed to: DEEPKIT:${eventPattern}`);
    }
}

module.exports = DeepKitEventBus;
