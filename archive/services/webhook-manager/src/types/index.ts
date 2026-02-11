export interface WebhookEndpoint {
  id: number;
  name: string;
  url: string;
  secret: string | null;
  events: string | null;
  active: boolean;
  created_at: string;
}

export interface WebhookEvent {
  id: number;
  endpoint_id: number | null;
  event_type: string;
  payload: any;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  retry_count: number;
  response_status: number | null;
  response_body: string | null;
  error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface CreateEndpointRequest {
  name: string;
  url: string;
  secret?: string;
  events?: string;
}

export interface CreateEventRequest {
  endpoint_id?: number;
  event_type: string;
  payload: any;
}
