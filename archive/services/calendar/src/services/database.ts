import { Pool } from 'pg';
import type { Event, Booking, Availability, CreateEventRequest, CreateBookingRequest, CreateAvailabilityRequest } from '../types';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'calendar',
  user: process.env.POSTGRES_USER || 'deepkit',
  password: process.env.POSTGRES_PASSWORD || 'deepkit',
});

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        all_day BOOLEAN DEFAULT false,
        color VARCHAR(20) DEFAULT '#39FF14',
        location VARCHAR(255),
        is_recurring BOOLEAN DEFAULT false,
        recurrence_rule JSONB,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        attendee_name VARCHAR(255),
        attendee_email VARCHAR(255),
        attendee_phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        booked_at TIMESTAMP DEFAULT NOW(),
        reminder_sent BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS availability (
        id SERIAL PRIMARY KEY,
        day_of_week INTEGER,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        active BOOLEAN DEFAULT true
      );

      CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
      CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_availability_day ON availability(day_of_week);
    `);

    // Add columns if they don't exist (migration for existing tables)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='all_day') THEN
          ALTER TABLE events ADD COLUMN all_day BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='color') THEN
          ALTER TABLE events ADD COLUMN color VARCHAR(20) DEFAULT '#39FF14';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='updated_at') THEN
          ALTER TABLE events ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        END IF;
      END $$;
    `);

    console.log('Database schema initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Events
export async function getEvents(startDate?: string, endDate?: string): Promise<Event[]> {
  let query = 'SELECT * FROM events';
  const params: string[] = [];

  if (startDate && endDate) {
    query += ' WHERE start_time >= $1 AND end_time <= $2';
    params.push(startDate, endDate);
  } else if (startDate) {
    query += ' WHERE start_time >= $1';
    params.push(startDate);
  } else if (endDate) {
    query += ' WHERE end_time <= $1';
    params.push(endDate);
  }

  query += ' ORDER BY start_time ASC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getEventById(id: number): Promise<Event | null> {
  const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createEvent(event: CreateEventRequest): Promise<Event> {
  const result = await pool.query(
    `INSERT INTO events (title, description, start_time, end_time, all_day, color, location, is_recurring, recurrence_rule, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      event.title,
      event.description || null,
      event.start_time,
      event.end_time,
      event.all_day || false,
      event.color || '#39FF14',
      event.location || null,
      event.is_recurring || false,
      event.recurrence_rule ? JSON.stringify(event.recurrence_rule) : null,
      event.created_by || null
    ]
  );
  return result.rows[0];
}

export async function updateEvent(id: number, event: Partial<CreateEventRequest>): Promise<Event | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (event.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(event.title);
  }
  if (event.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(event.description);
  }
  if (event.start_time !== undefined) {
    fields.push(`start_time = $${paramIndex++}`);
    values.push(event.start_time);
  }
  if (event.end_time !== undefined) {
    fields.push(`end_time = $${paramIndex++}`);
    values.push(event.end_time);
  }
  if (event.all_day !== undefined) {
    fields.push(`all_day = $${paramIndex++}`);
    values.push(event.all_day);
  }
  if (event.color !== undefined) {
    fields.push(`color = $${paramIndex++}`);
    values.push(event.color);
  }
  if (event.location !== undefined) {
    fields.push(`location = $${paramIndex++}`);
    values.push(event.location);
  }
  if (event.is_recurring !== undefined) {
    fields.push(`is_recurring = $${paramIndex++}`);
    values.push(event.is_recurring);
  }
  if (event.recurrence_rule !== undefined) {
    fields.push(`recurrence_rule = $${paramIndex++}`);
    values.push(event.recurrence_rule ? JSON.stringify(event.recurrence_rule) : null);
  }

  if (fields.length === 0) {
    return getEventById(id);
  }

  // Always update updated_at
  fields.push(`updated_at = NOW()`);

  values.push(id);
  const result = await pool.query(
    `UPDATE events SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteEvent(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM events WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Bookings
export async function getBookings(eventId?: number): Promise<Booking[]> {
  let query = 'SELECT * FROM bookings';
  const params: number[] = [];

  if (eventId !== undefined) {
    query += ' WHERE event_id = $1';
    params.push(eventId);
  }

  query += ' ORDER BY booked_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function createBooking(booking: CreateBookingRequest): Promise<Booking> {
  const result = await pool.query(
    `INSERT INTO bookings (event_id, attendee_name, attendee_email, attendee_phone, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [
      booking.event_id || null,
      booking.attendee_name,
      booking.attendee_email,
      booking.attendee_phone || null
    ]
  );
  return result.rows[0];
}

export async function confirmBooking(id: number): Promise<Booking | null> {
  const result = await pool.query(
    `UPDATE bookings SET status = 'confirmed' WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

export async function cancelBooking(id: number): Promise<Booking | null> {
  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

// Availability
export async function getAvailability(): Promise<Availability[]> {
  const result = await pool.query('SELECT * FROM availability WHERE active = true ORDER BY day_of_week, start_time');
  return result.rows;
}

export async function createAvailability(availability: CreateAvailabilityRequest): Promise<Availability> {
  const result = await pool.query(
    `INSERT INTO availability (day_of_week, start_time, end_time, active)
     VALUES ($1, $2, $3, true)
     RETURNING *`,
    [availability.day_of_week, availability.start_time, availability.end_time]
  );
  return result.rows[0];
}

export async function deleteAvailability(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM availability WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Stats
export async function getStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const [todayEvents, weekEvents, pendingBookings] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM events WHERE start_time >= $1 AND start_time <= $2', [todayStart, todayEnd]),
    pool.query('SELECT COUNT(*) FROM events WHERE start_time >= $1 AND start_time <= $2', [weekStart, weekEnd]),
    pool.query('SELECT COUNT(*) FROM bookings WHERE status = $1', ['pending'])
  ]);

  return {
    today: parseInt(todayEvents.rows[0].count, 10),
    thisWeek: parseInt(weekEvents.rows[0].count, 10),
    pendingBookings: parseInt(pendingBookings.rows[0].count, 10)
  };
}

export { pool };
