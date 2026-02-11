import { Pool } from 'pg';
import type { Client, Invoice, InvoiceItem, Payment, CreateClientRequest, CreateInvoiceRequest, CreatePaymentRequest } from '../types';

export const pool = new Pool({
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
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        tax_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id),
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        subtotal DECIMAL(10, 2) DEFAULT 0,
        tax_rate DECIMAL(5, 2) DEFAULT 0,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        total DECIMAL(10, 2) DEFAULT 0,
        notes TEXT,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id),
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_date DATE NOT NULL,
        reference VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
      CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    `);
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Clients
export async function getClients(): Promise<Client[]> {
  const result = await pool.query('SELECT * FROM clients ORDER BY name ASC');
  return result.rows;
}

export async function createClient(client: CreateClientRequest): Promise<Client> {
  const result = await pool.query(
    'INSERT INTO clients (name, email, phone, address, tax_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [client.name, client.email || null, client.phone || null, client.address || null, client.tax_id || null]
  );
  return result.rows[0];
}

export async function deleteClient(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Invoices
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

export async function getInvoices(status?: string, clientId?: number): Promise<Invoice[]> {
  let query = 'SELECT * FROM invoices WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND status = $${paramIndex++}`;
    params.push(status);
  }

  if (clientId !== undefined) {
    query += ` AND client_id = $${paramIndex++}`;
    params.push(clientId);
  }

  query += ' ORDER BY issue_date DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getInvoiceById(id: number): Promise<Invoice | null> {
  const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createInvoice(invoice: CreateInvoiceRequest): Promise<Invoice> {
  const invoiceNumber = generateInvoiceNumber();
  const issueDate = new Date().toISOString().split('T')[0];
  const taxRate = invoice.tax_rate || 0;

  // Calculate totals
  let subtotal = 0;
  for (const item of invoice.items) {
    subtotal += item.quantity * item.unit_price;
  }

  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // Create invoice
  const result = await pool.query(
    `INSERT INTO invoices (client_id, invoice_number, issue_date, due_date, tax_rate, subtotal, tax_amount, total, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [invoice.client_id, invoiceNumber, issueDate, invoice.due_date, taxRate, subtotal, taxAmount, total, invoice.notes || null]
  );

  const createdInvoice = result.rows[0];

  // Create invoice items
  for (const item of invoice.items) {
    const amount = item.quantity * item.unit_price;
    await pool.query(
      'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES ($1, $2, $3, $4, $5)',
      [createdInvoice.id, item.description, item.quantity, item.unit_price, amount]
    );
  }

  return createdInvoice;
}

export async function getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
  const result = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
  return result.rows;
}

export async function updateInvoiceStatus(id: number, status: string): Promise<Invoice | null> {
  const result = await pool.query(
    `UPDATE invoices
     SET status = $1, paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );
  return result.rows[0] || null;
}

export async function deleteInvoice(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM invoices WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Payments
export async function getPayments(invoiceId?: number): Promise<Payment[]> {
  let query = 'SELECT * FROM payments';
  const params: number[] = [];

  if (invoiceId !== undefined) {
    query += ' WHERE invoice_id = $1';
    params.push(invoiceId);
  }

  query += ' ORDER BY payment_date DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function createPayment(payment: CreatePaymentRequest): Promise<Payment> {
  const result = await pool.query(
    'INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [payment.invoice_id, payment.amount, payment.payment_method, payment.payment_date, payment.reference || null]
  );

  // Update invoice status to paid if full payment received
  const invoice = await getInvoiceById(payment.invoice_id);
  if (invoice) {
    const payments = await getPayments(payment.invoice_id);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    if (totalPaid >= parseFloat(invoice.total.toString())) {
      await updateInvoiceStatus(payment.invoice_id, 'paid');
    }
  }

  return result.rows[0];
}

// Stats
export async function getStats() {
  const [totalInvoices, pendingInvoices, paidInvoices, totalRevenue, overdueInvoices] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM invoices'),
    pool.query('SELECT COUNT(*) FROM invoices WHERE status = $1', ['sent']),
    pool.query('SELECT COUNT(*) FROM invoices WHERE status = $1', ['paid']),
    pool.query('SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status = $1', ['paid']),
    pool.query('SELECT COUNT(*) FROM invoices WHERE status IN ($1, $2) AND due_date < CURRENT_DATE', ['sent', 'draft'])
  ]);

  return {
    totalInvoices: parseInt(totalInvoices.rows[0].count, 10),
    pending: parseInt(pendingInvoices.rows[0].count, 10),
    paid: parseInt(paidInvoices.rows[0].count, 10),
    revenue: `$${parseFloat(totalRevenue.rows[0].coalesce).toFixed(2)}`,
    overdue: parseInt(overdueInvoices.rows[0].count, 10)
  };
}

export { pool };
