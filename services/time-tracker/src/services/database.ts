import { Pool } from 'pg';
import dayjs from 'dayjs';
import type { Project, TimeEntry, Timer, CreateProjectRequest, CreateTimeEntryRequest, StartTimerRequest, TimeSummary } from '../types';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        default_hourly_rate DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS time_entries (
        id SERIAL PRIMARY KEY,
        task_id INTEGER,
        project_id INTEGER REFERENCES projects(id),
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration_seconds INTEGER,
        is_billable BOOLEAN DEFAULT false,
        hourly_rate DECIMAL(10, 2),
        total_amount DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS timers (
        id SERIAL PRIMARY KEY,
        task_id INTEGER,
        project_id INTEGER REFERENCES projects(id),
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_time_entries_start ON time_entries(start_time);
      CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
    `);
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Projects
export async function getProjects(): Promise<Project[]> {
  const result = await pool.query('SELECT * FROM projects ORDER BY name ASC');
  return result.rows;
}

export async function createProject(project: CreateProjectRequest): Promise<Project> {
  const result = await pool.query(
    'INSERT INTO projects (name, default_hourly_rate) VALUES ($1, $2) RETURNING *',
    [project.name, project.default_hourly_rate || null]
  );
  return result.rows[0];
}

export async function deleteProject(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Time Entries
export async function getTimeEntries(startDate?: string, endDate?: string, projectId?: number): Promise<TimeEntry[]> {
  let query = 'SELECT * FROM time_entries WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (startDate) {
    query += ` AND start_time >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND start_time <= $${paramIndex++}`;
    params.push(endDate);
  }

  if (projectId !== undefined) {
    query += ` AND project_id = $${paramIndex++}`;
    params.push(projectId);
  }

  query += ' ORDER BY start_time DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function createTimeEntry(entry: CreateTimeEntryRequest): Promise<TimeEntry> {
  // Calculate duration and total amount if end_time is provided
  let durationSeconds = entry.duration_seconds || null;
  let totalAmount = null;

  if (entry.end_time && entry.start_time) {
    const start = dayjs(entry.start_time);
    const end = dayjs(entry.end_time);
    durationSeconds = end.diff(start, 'second');

    if (entry.is_billable && entry.hourly_rate && durationSeconds) {
      const hours = durationSeconds / 3600;
      totalAmount = hours * entry.hourly_rate;
    }
  }

  const result = await pool.query(
    `INSERT INTO time_entries (task_id, project_id, description, start_time, end_time, duration_seconds, is_billable, hourly_rate, total_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      entry.task_id || null,
      entry.project_id || null,
      entry.description || null,
      entry.start_time,
      entry.end_time || null,
      durationSeconds,
      entry.is_billable || false,
      entry.hourly_rate || null,
      totalAmount
    ]
  );
  return result.rows[0];
}

export async function updateTimeEntry(id: number, entry: Partial<CreateTimeEntryRequest>): Promise<TimeEntry | null> {
  const current = await pool.query('SELECT * FROM time_entries WHERE id = $1', [id]);
  if (current.rows.length === 0) return null;

  const currentEntry = current.rows[0];
  const updatedEntry = { ...currentEntry, ...entry };

  // Recalculate duration and total amount if times change
  let durationSeconds = updatedEntry.duration_seconds;
  let totalAmount = updatedEntry.total_amount;

  if (updatedEntry.end_time && updatedEntry.start_time) {
    const start = dayjs(updatedEntry.start_time);
    const end = dayjs(updatedEntry.end_time);
    durationSeconds = end.diff(start, 'second');

    if (updatedEntry.is_billable && updatedEntry.hourly_rate && durationSeconds) {
      const hours = durationSeconds / 3600;
      totalAmount = hours * updatedEntry.hourly_rate;
    }
  }

  const result = await pool.query(
    `UPDATE time_entries
     SET task_id = $1, project_id = $2, description = $3, start_time = $4, end_time = $5,
         duration_seconds = $6, is_billable = $7, hourly_rate = $8, total_amount = $9
     WHERE id = $10
     RETURNING *`,
    [
      updatedEntry.task_id,
      updatedEntry.project_id,
      updatedEntry.description,
      updatedEntry.start_time,
      updatedEntry.end_time,
      durationSeconds,
      updatedEntry.is_billable,
      updatedEntry.hourly_rate,
      totalAmount,
      id
    ]
  );
  return result.rows[0];
}

export async function deleteTimeEntry(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM time_entries WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Timers
export async function getActiveTimer(): Promise<Timer | null> {
  const result = await pool.query('SELECT * FROM timers ORDER BY start_time DESC LIMIT 1');
  return result.rows[0] || null;
}

export async function startTimer(timer: StartTimerRequest): Promise<Timer> {
  // Stop any existing timer first
  await pool.query('DELETE FROM timers');

  const result = await pool.query(
    'INSERT INTO timers (task_id, project_id, description, start_time) VALUES ($1, $2, $3, NOW()) RETURNING *',
    [timer.task_id || null, timer.project_id || null, timer.description || null]
  );
  return result.rows[0];
}

export async function stopTimer(): Promise<TimeEntry | null> {
  const timer = await getActiveTimer();
  if (!timer) return null;

  // Get project default hourly rate if exists
  let hourlyRate = null;
  if (timer.project_id) {
    const project = await pool.query('SELECT default_hourly_rate FROM projects WHERE id = $1', [timer.project_id]);
    if (project.rows.length > 0) {
      hourlyRate = project.rows[0].default_hourly_rate;
    }
  }

  // Create time entry from timer
  const timeEntry = await createTimeEntry({
    task_id: timer.task_id || undefined,
    project_id: timer.project_id || undefined,
    description: timer.description || undefined,
    start_time: timer.start_time,
    end_time: new Date().toISOString(),
    is_billable: hourlyRate !== null,
    hourly_rate: hourlyRate || undefined
  });

  // Delete timer
  await pool.query('DELETE FROM timers WHERE id = $1', [timer.id]);

  return timeEntry;
}

// Reports
export async function getSummary(startDate?: string, endDate?: string): Promise<TimeSummary> {
  let query = 'SELECT SUM(duration_seconds) as total_seconds, SUM(CASE WHEN is_billable THEN duration_seconds ELSE 0 END) as billable_seconds, SUM(total_amount) as total_amount, COUNT(*) as entries FROM time_entries WHERE duration_seconds IS NOT NULL';
  const params: string[] = [];
  let paramIndex = 1;

  if (startDate) {
    query += ` AND start_time >= $${paramIndex++}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND start_time <= $${paramIndex++}`;
    params.push(endDate);
  }

  const result = await pool.query(query, params);
  const row = result.rows[0];

  const totalSeconds = parseInt(row.total_seconds || '0', 10);
  const billableSeconds = parseInt(row.billable_seconds || '0', 10);
  const totalAmount = parseFloat(row.total_amount || '0');
  const entries = parseInt(row.entries || '0', 10);

  return {
    totalSeconds,
    totalFormatted: formatDuration(totalSeconds),
    billableSeconds,
    billableFormatted: formatDuration(billableSeconds),
    totalAmount,
    entries
  };
}

export async function getStats() {
  const today = dayjs().startOf('day').toISOString();
  const weekStart = dayjs().startOf('week').toISOString();

  const [todaySummary, weekSummary, activeTimer] = await Promise.all([
    getSummary(today),
    getSummary(weekStart),
    getActiveTimer()
  ]);

  return {
    today: todaySummary.totalFormatted,
    thisWeek: weekSummary.totalFormatted,
    active: activeTimer ? 'Running ⏱️' : 'Stopped'
  };
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export { pool };
