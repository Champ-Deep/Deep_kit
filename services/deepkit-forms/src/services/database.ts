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
      CREATE TABLE IF NOT EXISTS forms (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        settings JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        form_id INTEGER REFERENCES forms(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        question_text TEXT NOT NULL,
        options JSONB,
        validation JSONB,
        position INTEGER NOT NULL,
        logic JSONB
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS responses (
        id SERIAL PRIMARY KEY,
        form_id INTEGER REFERENCES forms(id),
        respondent_id VARCHAR(100),
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        traits JSONB,
        persona VARCHAR(100),
        recommendations JSONB
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        response_id INTEGER REFERENCES responses(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES questions(id),
        answer_data JSONB,
        behavior_data JSONB
      )
    `);

    await client.query('COMMIT');
    console.log('✅ DeepKit Forms database initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
