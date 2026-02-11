export interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  created_at: string;
}

export interface Invoice {
  id: number;
  client_id: number;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference: string | null;
  created_at: string;
}

export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
}

export interface CreateInvoiceRequest {
  client_id: number;
  due_date: string;
  tax_rate?: number;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface CreatePaymentRequest {
  invoice_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference?: string;
}
