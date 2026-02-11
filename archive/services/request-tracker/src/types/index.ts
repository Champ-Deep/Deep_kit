export interface Department {
  id: number;
  name: string;
  email: string | null;
  sla_response_hours: number;
  sla_resolution_hours: number;
}

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus = 'New' | 'In Progress' | 'Resolved' | 'Closed';

export interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string | null;
  department_id: number;
  priority: TicketPriority;
  status: TicketStatus;
  requester_name: string | null;
  requester_email: string | null;
  assigned_to: string | null;
  created_at: Date;
  updated_at: Date;
  sla_response_due: Date | null;
  sla_resolution_due: Date | null;
  sla_breached: boolean;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  author: string;
  comment: string;
  is_internal: boolean;
  created_at: Date;
}

export interface TicketAttachment {
  id: number;
  ticket_id: number;
  filename: string;
  filepath: string;
  filesize: number;
  uploaded_by: string | null;
  uploaded_at: Date;
}

export interface CreateTicketRequest {
  subject: string;
  description?: string;
  departmentId: number;
  priority?: TicketPriority;
  requesterName?: string;
  requesterEmail?: string;
}

export interface UpdateTicketRequest {
  subject?: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedTo?: string;
}

export interface CreateCommentRequest {
  author: string;
  comment: string;
  isInternal?: boolean;
}

export interface WebSocketMessage {
  type: 'ticket_created' | 'ticket_updated' | 'comment_added' | 'sla_breach';
  ticket?: Ticket;
  comment?: TicketComment;
  timestamp: number;
}
