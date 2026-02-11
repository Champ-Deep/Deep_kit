import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Initialize database schema
export const initializeDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create short_links table
    await client.query(`
      CREATE TABLE IF NOT EXISTS short_links (
        id SERIAL PRIMARY KEY,
        short_code VARCHAR(20) UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        custom_code BOOLEAN DEFAULT FALSE,
        password_hash VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        created_by VARCHAR(100),
        qr_code_id INTEGER
      )
    `);

    // Create link_clicks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS link_clicks (
        id SERIAL PRIMARY KEY,
        link_id INTEGER REFERENCES short_links(id) ON DELETE CASCADE,
        clicked_at TIMESTAMP DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT,
        referrer TEXT,
        country VARCHAR(2),
        city VARCHAR(100),
        device VARCHAR(50),
        browser VARCHAR(50),
        os VARCHAR(50)
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_short_code ON short_links(short_code)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON link_clicks(link_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks(clicked_at)
    `);

    await client.query('COMMIT');
    console.log('✅ Database schema initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
