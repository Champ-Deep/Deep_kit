import pool from './database';
import { Ticket, CreateTicketRequest, UpdateTicketRequest, TicketComment, CreateCommentRequest } from '../types';

export const generateTicketNumber = async (): Promise<string> => {
  const result = await pool.query('SELECT COUNT(*) as count FROM tickets');
  const count = parseInt(result.rows[0].count) + 1;
  const padded = count.toString().padStart(5, '0');
  return `TKT-${padded}`;
};

export const calculateSLA = (departmentId: number, created: Date) => {
  const response = new Date(created);
  response.setHours(response.getHours() + 24);
  const resolution = new Date(created);
  resolution.setHours(resolution.getHours() + 72);
  return { response, resolution };
};

export const createTicket = async (request: CreateTicketRequest): Promise<Ticket> => {
  const ticketNumber = await generateTicketNumber();
  const now = new Date();
  const sla = calculateSLA(request.departmentId, now);

  const result = await pool.query(
    `INSERT INTO tickets (ticket_number, subject, description, department_id, priority, requester_name, requester_email, sla_response_due, sla_resolution_due)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      ticketNumber,
      request.subject,
      request.description || null,
      request.departmentId,
      request.priority || 'Medium',
      request.requesterName || null,
      request.requesterEmail || null,
      sla.response,
      sla.resolution
    ]
  );

  return result.rows[0];
};

export const getAllTickets = async (): Promise<Ticket[]> => {
  const result = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC');
  return result.rows;
};

export const getTicketById = async (id: number): Promise<Ticket | null> => {
  const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const updateTicket = async (id: number, updates: UpdateTicketRequest): Promise<Ticket | null> => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.subject) {
    fields.push(`subject = $${paramIndex++}`);
    values.push(updates.subject);
  }
  if (updates.description) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.priority) {
    fields.push(`priority = $${paramIndex++}`);
    values.push(updates.priority);
  }
  if (updates.status) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.assignedTo !== undefined) {
    fields.push(`assigned_to = $${paramIndex++}`);
    values.push(updates.assignedTo);
  }

  fields.push('updated_at = NOW()');

  if (fields.length === 1) return getTicketById(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
};

export const addComment = async (ticketId: number, request: CreateCommentRequest): Promise<TicketComment> => {
  const result = await pool.query(
    `INSERT INTO ticket_comments (ticket_id, author, comment, is_internal)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [ticketId, request.author, request.comment, request.isInternal || false]
  );

  return result.rows[0];
};

export const getTicketComments = async (ticketId: number): Promise<TicketComment[]> => {
  const result = await pool.query(
    'SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC',
    [ticketId]
  );
  return result.rows;
};

export const getAllDepartments = async () => {
  const result = await pool.query('SELECT * FROM departments ORDER BY name');
  return result.rows;
};
