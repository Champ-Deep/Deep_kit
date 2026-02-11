import express, { Request, Response } from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import { Pool } from 'pg';
import path from 'path';

// DeepKit Fabric: shared auth, logging, metrics, event bus
const fabric = require('deepkit-fabric');
const { DeepKitEventBus, deepkitAuth, structuredLogger, metricsMiddleware, metricsEndpoint, healthEndpoint } = fabric;

const app = express();
const PORT = process.env.PORT || 3025;

// Event Bus
export const eventBus = new DeepKitEventBus('champmail');

// Database connection
export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'champmail',
  user: process.env.POSTGRES_USER || 'deepkit',
  password: process.env.POSTGRES_PASSWORD || '',
});

// Email queue setup (BullMQ with Redis)
export const emailQueue = new Queue('email-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

// Initialize database
const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id SERIAL PRIMARY KEY,
        to_address VARCHAR(255) NOT NULL,
        from_address VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        html TEXT,
        status VARCHAR(50) DEFAULT 'queued',
        created_at TIMESTAMP DEFAULT NOW(),
        sent_at TIMESTAMP,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        subject VARCHAR(500),
        html TEXT NOT NULL,
        variables JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS email_stats (
        id SERIAL PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        total_sent INT DEFAULT 0,
        total_failed INT DEFAULT 0,
        total_queued INT DEFAULT 0,
        UNIQUE(date)
      );
    `);
    console.log('ChampMail database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    client.release();
  }
};

// Middleware stack
app.use(structuredLogger);
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(deepkitAuth);

// Prometheus metrics
app.get('/metrics', metricsEndpoint);

// Health check (enriched)
app.get('/health', healthEndpoint({
  dependencies: [
    { name: 'database', check: async () => { try { await pool.query('SELECT 1'); return true; } catch { return false; } } },
    { name: 'email_queue', check: async () => { try { await emailQueue.getJobCounts(); return true; } catch { return false; } } },
    { name: 'event_bus', check: async () => !!eventBus }
  ]
}));

// Routes

// Send single email
app.post('/api/send', async (req: Request, res: Response) => {
  try {
    const { to, from = 'noreply@deepkit.local', subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    const result = await pool.query(
      'INSERT INTO emails (to_address, from_address, subject, html, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [to, from, subject, html, 'queued']
    );

    const emailId = result.rows[0].id;

    await emailQueue.add('send-email', { emailId, to, from, subject, html });

    // Publish event
    const correlationId = req.headers['x-correlation-id'] as string;
    await eventBus.publish('EMAIL_SENT', { emailId, to, subject }, correlationId);

    res.json({ status: 'queued', emailId, message: 'Email queued for delivery' });
  } catch (error: any) {
    console.error('Send email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send bulk emails
app.post('/api/send-bulk', async (req: Request, res: Response) => {
  try {
    const { contacts, from = 'noreply@deepkit.local', subject, html } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'contacts must be a non-empty array' });
    }

    if (!subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: subject, html' });
    }

    const jobs: any[] = [];
    const emailIds: number[] = [];

    for (const contact of contacts) {
      const personalizedSubject = subject.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
        return contact[key] || match;
      });

      const personalizedHtml = html.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
        return contact[key] || match;
      });

      const result = await pool.query(
        'INSERT INTO emails (to_address, from_address, subject, html, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [contact.email, from, personalizedSubject, personalizedHtml, 'queued']
      );

      const emailId = result.rows[0].id;
      emailIds.push(emailId);

      jobs.push({
        name: 'send-email',
        data: { emailId, to: contact.email, from, subject: personalizedSubject, html: personalizedHtml },
      });
    }

    await emailQueue.addBulk(jobs);

    res.json({ status: 'queued', count: jobs.length, emailIds, message: `${jobs.length} emails queued for delivery` });
  } catch (error: any) {
    console.error('Bulk send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get email stats
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const queueCounts = await emailQueue.getJobCounts();

    const dbStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'queued') as queued
      FROM emails
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    res.json({ today: dbStats.rows[0], queue: queueCounts });
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List recent emails
app.get('/api/emails', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await pool.query(
      'SELECT id, to_address, subject, status, created_at, sent_at FROM emails ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.json({ emails: result.rows });
  } catch (error: any) {
    console.error('List emails error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Templates

app.post('/api/templates', async (req: Request, res: Response) => {
  try {
    const { name, subject, html, variables = [] } = req.body;
    if (!name || !html) {
      return res.status(400).json({ error: 'Missing required fields: name, html' });
    }
    const result = await pool.query(
      'INSERT INTO email_templates (name, subject, html, variables) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, subject, html, JSON.stringify(variables)]
    );
    res.json({ success: true, templateId: result.rows[0].id, message: 'Template created successfully' });
  } catch (error: any) {
    console.error('Create template error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/templates', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, subject, variables, created_at FROM email_templates ORDER BY name');
    res.json({ templates: result.rows });
  } catch (error: any) {
    console.error('List templates error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM email_templates WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ template: result.rows[0] });
  } catch (error: any) {
    console.error('Get template error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-template', async (req: Request, res: Response) => {
  try {
    const { templateId, to, from = 'noreply@deepkit.local', data = {} } = req.body;
    if (!templateId || !to) {
      return res.status(400).json({ error: 'Missing required fields: templateId, to' });
    }
    const templateResult = await pool.query('SELECT * FROM email_templates WHERE id = $1', [templateId]);
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    const template = templateResult.rows[0];
    let subject = template.subject;
    let html = template.html;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject?.replace(regex, String(value));
      html = html.replace(regex, String(value));
    }
    const emailResult = await pool.query(
      'INSERT INTO emails (to_address, from_address, subject, html, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [to, from, subject, html, 'queued']
    );
    const emailId = emailResult.rows[0].id;
    await emailQueue.add('send-email', { emailId, to, from, subject, html });

    const correlationId = req.headers['x-correlation-id'] as string;
    await eventBus.publish('EMAIL_SENT', { emailId, to, subject, template: template.name }, correlationId);

    res.json({ status: 'queued', emailId, message: 'Email queued using template' });
  } catch (error: any) {
    console.error('Send template error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const startServer = async () => {
  await eventBus.connect();
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`ChampMail running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Metrics: http://localhost:${PORT}/metrics`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start ChampMail:', error);
  process.exit(1);
});
