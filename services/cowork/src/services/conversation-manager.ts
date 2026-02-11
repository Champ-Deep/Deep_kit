import { Pool } from 'pg';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface Session {
  id: string;
  user_id?: string;
  created_at: Date;
  updated_at: Date;
}

export class ConversationManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);
  }

  /**
   * Create new session
   */
  async createSession(userId?: string): Promise<string> {
    const result = await this.pool.query(
      'INSERT INTO sessions (user_id) VALUES ($1) RETURNING id',
      [userId || null]
    );

    return result.rows[0].id;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const result = await this.pool.query(
      'SELECT * FROM sessions WHERE id = $1',
      [sessionId]
    );

    return result.rows[0] || null;
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    await this.pool.query(
      'INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, role, content]
    );

    // Update session timestamp
    await this.pool.query(
      'UPDATE sessions SET updated_at = NOW() WHERE id = $1',
      [sessionId]
    );
  }

  /**
   * Get conversation history for session
   */
  async getHistory(
    sessionId: string,
    limit: number = 50
  ): Promise<Message[]> {
    const result = await this.pool.query(
      `SELECT role, content, timestamp
       FROM messages
       WHERE session_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [sessionId, limit]
    );

    return result.rows.reverse(); // Return in chronological order
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    const result = await this.pool.query(
      'SELECT * FROM sessions ORDER BY updated_at DESC LIMIT $1',
      [limit]
    );

    return result.rows;
  }

  /**
   * Delete session and all messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  }

  /**
   * Get session stats
   */
  async getStats(): Promise<{ total_sessions: number; total_messages: number }> {
    const result = await this.pool.query(`
      SELECT
        (SELECT COUNT(*) FROM sessions) as total_sessions,
        (SELECT COUNT(*) FROM messages) as total_messages
    `);

    return result.rows[0];
  }
}
