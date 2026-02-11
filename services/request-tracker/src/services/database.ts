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

    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255),
        sla_response_hours INTEGER DEFAULT 24,
        sla_resolution_hours INTEGER DEFAULT 72
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_number VARCHAR(20) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        department_id INTEGER REFERENCES departments(id),
        priority VARCHAR(20) DEFAULT 'Medium',
        status VARCHAR(20) DEFAULT 'New',
        requester_name VARCHAR(100),
        requester_email VARCHAR(255),
        assigned_to VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        sla_response_due TIMESTAMP,
        sla_resolution_due TIMESTAMP,
        sla_breached BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        author VARCHAR(100) NOT NULL,
        comment TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_attachments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        filepath TEXT NOT NULL,
        filesize BIGINT,
        uploaded_by VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default departments
    await client.query(`
      INSERT INTO departments (name, email, sla_response_hours, sla_resolution_hours)
      VALUES 
        ('IT Support', 'it@deepkit.local', 4, 24),
        ('Finance', 'finance@deepkit.local', 24, 72),
        ('HR', 'hr@deepkit.local', 24, 72),
        ('Marketing', 'marketing@deepkit.local', 48, 168),
        ('Sales', 'sales@deepkit.local', 12, 48)
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✅ Request Tracker database initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
