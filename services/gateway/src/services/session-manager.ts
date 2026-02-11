import Redis from 'ioredis';
import { Session, ChannelType } from '../types';

export class SessionManager {
  private redis: Redis;
  private sessionTTL: number = 86400; // 24 hours

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
      console.log('✅ Session manager connected to Redis');
    });

    this.redis.on('error', (err: Error) => {
      console.error('Redis error:', err);
    });
  }

  async getOrCreateSession(
    userId: string, 
    channel: ChannelType, 
    chatId: string
  ): Promise<Session> {
    const sessionKey = `session:${userId}:${channel}:${chatId}`;
    const existing = await this.redis.get(sessionKey);

    if (existing) {
      const session: Session = JSON.parse(existing);
      session.lastActivity = new Date();
      await this.saveSession(sessionKey, session);
      return session;
    }

    const newSession: Session = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      channel,
      chatId,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    await this.saveSession(sessionKey, newSession);
    console.log(`📝 New session created: ${newSession.id} (${channel})`);
    return newSession;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const keys = await this.redis.keys(`session:*`);
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session: Session = JSON.parse(data);
        if (session.id === sessionId) {
          return session;
        }
      }
    }
    return null;
  }

  async updateSessionContext(sessionId: string, context: any): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      const sessionKey = `session:${session.userId}:${session.channel}:${session.chatId}`;
      session.context = { ...session.context, ...context };
      session.lastActivity = new Date();
      await this.saveSession(sessionKey, session);
    }
  }

  private async saveSession(key: string, session: Session): Promise<void> {
    await this.redis.setex(key, this.sessionTTL, JSON.stringify(session));
  }

  async cleanup(): Promise<void> {
    await this.redis.quit();
  }
}
