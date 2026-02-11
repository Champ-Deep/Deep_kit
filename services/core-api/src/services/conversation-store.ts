import Redis from 'ioredis';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class ConversationStore {
  private redis: Redis;
  private maxHistory: number = 50; // Keep last 50 messages

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://deepkit-cache:6379';
    const redisPassword = process.env.REDIS_PASSWORD;
    
    this.redis = new Redis(redisUrl, {
      password: redisPassword,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.redis.on('connect', () => {
      console.log('✅ Conversation store connected to Redis');
    });

    this.redis.on('error', (err: Error) => {
      console.error('Redis error:', err);
    });
  }

  async getHistory(sessionId: string): Promise<ConversationMessage[]> {
    try {
      const key = `conversation:${sessionId}`;
      const data = await this.redis.get(key);
      
      if (data) {
        const messages: ConversationMessage[] = JSON.parse(data);
        return messages;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async addExchange(
    sessionId: string, 
    userMessage: string, 
    assistantResponse: string
  ): Promise<void> {
    try {
      const key = `conversation:${sessionId}`;
      
      // Get existing history
      const history = await this.getHistory(sessionId);
      
      // Add new messages
      const newMessages: ConversationMessage[] = [
        ...history,
        {
          role: 'user',
          content: userMessage,
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: assistantResponse,
          timestamp: new Date()
        }
      ];

      // Keep only last N messages
      if (newMessages.length > this.maxHistory) {
        newMessages.splice(0, newMessages.length - this.maxHistory);
      }

      // Save with 24-hour expiry
      await this.redis.setex(key, 86400, JSON.stringify(newMessages));
      
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  async clearHistory(sessionId: string): Promise<void> {
    try {
      const key = `conversation:${sessionId}`;
      await this.redis.del(key);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  }

  async cleanup(): Promise<void> {
    await this.redis.quit();
  }
}
