import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

export const initializeDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create campaigns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        utm_term VARCHAR(100),
        utm_content VARCHAR(100),
        base_url TEXT NOT NULL,
        final_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        created_by VARCHAR(100)
      )
    `);

    // Create utm_clicks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS utm_clicks (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        clicked_at TIMESTAMP DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT,
        referrer TEXT,
        country VARCHAR(2),
        city VARCHAR(100)
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_name ON campaigns(name)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_utm_clicks_campaign_id ON utm_clicks(campaign_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_utm_clicks_clicked_at ON utm_clicks(clicked_at)
    `);

    await client.query('COMMIT');
    console.log('✅ UTM Tracker database schema initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
