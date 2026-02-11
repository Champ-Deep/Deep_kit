import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'champmail',
  user: process.env.POSTGRES_USER || 'deepkit',
  password: process.env.POSTGRES_PASSWORD || '',
});

// SMTP transporter configuration
const createTransporter = () => {
  // For development: use ethereal.email or local SMTP
  // For production: use real SMTP server

  const smtpHost = process.env.SMTP_HOST || 'localhost';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER || 'deepkit@local';
  const smtpPass = process.env.SMTP_PASS || '';

  // If no SMTP configured, use test mode
  if (!process.env.SMTP_HOST) {
    console.log('⚠️  No SMTP server configured. Using test mode (emails will not be sent).');
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: smtpUser ? {
      user: smtpUser,
      pass: smtpPass,
    } : undefined,
  });
};

const transporter = createTransporter();

interface EmailJob {
  emailId: number;
  to: string;
  from: string;
  subject: string;
  html: string;
}

// Email worker processor
const processEmailJob = async (job: Job<EmailJob>) => {
  const { emailId, to, from, subject, html } = job.data;

  console.log(`📧 Processing email ${emailId} to ${to}`);

  try {
    if (!transporter) {
      // Test mode: simulate successful send
      console.log(`✅ [TEST MODE] Email ${emailId} simulated: ${to} - ${subject}`);

      await pool.query(
        'UPDATE emails SET status = $1, sent_at = NOW() WHERE id = $2',
        ['sent', emailId]
      );

      return { success: true, mode: 'test' };
    }

    // Send actual email
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log(`✅ Email ${emailId} sent: ${info.messageId}`);

    // Update database
    await pool.query(
      'UPDATE emails SET status = $1, sent_at = NOW() WHERE id = $2',
      ['sent', emailId]
    );

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Email ${emailId} failed:`, error.message);

    // Update database with error
    await pool.query(
      'UPDATE emails SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error.message, emailId]
    );

    throw error; // Rethrow to trigger retry
  }
};

// Create worker
const worker = new Worker('email-queue', processEmailJob, {
  connection: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  concurrency: parseInt(process.env.EMAIL_CONCURRENCY || '5'),
  limiter: {
    max: parseInt(process.env.EMAIL_RATE_LIMIT || '100'), // max jobs per duration
    duration: parseInt(process.env.EMAIL_RATE_DURATION || '60000'), // 1 minute
  },
});

// Worker event listeners
worker.on('ready', () => {
  console.log('🚀 Email worker is ready');
});

worker.on('completed', (job: Job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job: Job | undefined, error: Error) => {
  console.error(`❌ Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error: Error) => {
  console.error('Worker error:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down email worker...');
  await worker.close();
  await pool.end();
  process.exit(0);
});

console.log('📨 Email worker started');
console.log(`📊 Concurrency: ${process.env.EMAIL_CONCURRENCY || 5}`);
console.log(`⏱️  Rate limit: ${process.env.EMAIL_RATE_LIMIT || 100} emails per ${(parseInt(process.env.EMAIL_RATE_DURATION || '60000') / 1000)}s`);

export { worker };
