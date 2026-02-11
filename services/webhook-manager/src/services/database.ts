import { Pool } from 'pg';
import axios from 'axios';
import crypto from 'crypto';
import type { WebhookEndpoint, WebhookEvent, CreateEndpointRequest, CreateEventRequest } from '../types';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_endpoints (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        secret VARCHAR(255),
        events TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        endpoint_id INTEGER REFERENCES webhook_endpoints(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        response_status INTEGER,
        response_body TEXT,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_events_status ON webhook_events(status);
      CREATE INDEX IF NOT EXISTS idx_events_endpoint ON webhook_events(endpoint_id);
      CREATE INDEX IF NOT EXISTS idx_events_type ON webhook_events(event_type);
    `);
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Endpoints
export async function getEndpoints(): Promise<WebhookEndpoint[]> {
  const result = await pool.query('SELECT * FROM webhook_endpoints ORDER BY name ASC');
  return result.rows;
}

export async function createEndpoint(endpoint: CreateEndpointRequest): Promise<WebhookEndpoint> {
  const result = await pool.query(
    'INSERT INTO webhook_endpoints (name, url, secret, events) VALUES ($1, $2, $3, $4) RETURNING *',
    [endpoint.name, endpoint.url, endpoint.secret || null, endpoint.events || null]
  );
  return result.rows[0];
}

export async function updateEndpoint(id: number, updates: Partial<CreateEndpointRequest>): Promise<WebhookEndpoint | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.url !== undefined) {
    fields.push(`url = $${paramIndex++}`);
    values.push(updates.url);
  }
  if (updates.secret !== undefined) {
    fields.push(`secret = $${paramIndex++}`);
    values.push(updates.secret);
  }
  if (updates.events !== undefined) {
    fields.push(`events = $${paramIndex++}`);
    values.push(updates.events);
  }

  if (fields.length === 0) return null;

  values.push(id);
  const result = await pool.query(
    `UPDATE webhook_endpoints SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function toggleEndpoint(id: number): Promise<WebhookEndpoint | null> {
  const result = await pool.query(
    'UPDATE webhook_endpoints SET active = NOT active WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
}

export async function deleteEndpoint(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM webhook_endpoints WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Events
export async function getEvents(status?: string, eventType?: string): Promise<WebhookEvent[]> {
  let query = 'SELECT * FROM webhook_events WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND status = $${paramIndex++}`;
    params.push(status);
  }

  if (eventType) {
    query += ` AND event_type = $${paramIndex++}`;
    params.push(eventType);
  }

  query += ' ORDER BY created_at DESC LIMIT 1000';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function createEvent(event: CreateEventRequest): Promise<WebhookEvent> {
  const result = await pool.query(
    'INSERT INTO webhook_events (endpoint_id, event_type, payload) VALUES ($1, $2, $3) RETURNING *',
    [event.endpoint_id || null, event.event_type, event.payload]
  );
  return result.rows[0];
}

export async function dispatchEvent(eventId: number): Promise<void> {
  const event = await pool.query('SELECT * FROM webhook_events WHERE id = $1', [eventId]);
  if (event.rows.length === 0) return;

  const webhookEvent = event.rows[0] as WebhookEvent;

  // Get endpoint if specified
  let endpoint: WebhookEndpoint | null = null;
  if (webhookEvent.endpoint_id) {
    const endpointResult = await pool.query('SELECT * FROM webhook_endpoints WHERE id = $1 AND active = true', [webhookEvent.endpoint_id]);
    endpoint = endpointResult.rows[0] || null;
  }

  if (!endpoint) {
    await pool.query(
      'UPDATE webhook_events SET status = $1, error = $2, processed_at = NOW() WHERE id = $3',
      ['failed', 'No active endpoint found', eventId]
    );
    return;
  }

  try {
    // Generate signature if secret exists
    const headers: any = { 'Content-Type': 'application/json' };
    if (endpoint.secret) {
      const signature = crypto
        .createHmac('sha256', endpoint.secret)
        .update(JSON.stringify(webhookEvent.payload))
        .digest('hex');
      headers['X-DeepKit-Signature'] = signature;
    }

    // Send webhook
    const response = await axios.post(endpoint.url, webhookEvent.payload, {
      headers,
      timeout: 10000
    });

    await pool.query(
      `UPDATE webhook_events
       SET status = 'success', response_status = $1, response_body = $2, processed_at = NOW()
       WHERE id = $3`,
      [response.status, JSON.stringify(response.data), eventId]
    );
  } catch (error: any) {
    const status = error.response?.status || null;
    const errorMessage = error.message || 'Unknown error';

    if (webhookEvent.retry_count < MAX_RETRIES) {
      // Schedule retry
      await pool.query(
        `UPDATE webhook_events
         SET status = 'retrying', retry_count = retry_count + 1, error = $1, response_status = $2
         WHERE id = $3`,
        [errorMessage, status, eventId]
      );

      // Retry after delay
      setTimeout(() => dispatchEvent(eventId), RETRY_DELAYS[webhookEvent.retry_count] || 15000);
    } else {
      // Max retries reached
      await pool.query(
        `UPDATE webhook_events
         SET status = 'failed', error = $1, response_status = $2, processed_at = NOW()
         WHERE id = $3`,
        [errorMessage, status, eventId]
      );
    }
  }
}

export async function retryEvent(eventId: number): Promise<void> {
  await pool.query('UPDATE webhook_events SET status = $1, retry_count = 0 WHERE id = $2', ['pending', eventId]);
  await dispatchEvent(eventId);
}

// Stats
export async function getStats() {
  const [total, pending, success, failed] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM webhook_events'),
    pool.query('SELECT COUNT(*) FROM webhook_events WHERE status = $1', ['pending']),
    pool.query('SELECT COUNT(*) FROM webhook_events WHERE status = $1', ['success']),
    pool.query('SELECT COUNT(*) FROM webhook_events WHERE status = $1', ['failed'])
  ]);

  return {
    totalEvents: parseInt(total.rows[0].count, 10),
    pending: parseInt(pending.rows[0].count, 10),
    success: parseInt(success.rows[0].count, 10),
    failed: parseInt(failed.rows[0].count, 10)
  };
}

export { pool };
