export interface Collection {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Request {
  id: number;
  collection_id: number | null;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: string | null;
  body: string | null;
  body_type: 'json' | 'form' | 'raw' | null;
  created_at: string;
}

export interface Environment {
  id: number;
  name: string;
  variables: string;
  active: number;
  created_at: string;
}

export interface HistoryEntry {
  id: number;
  request_id: number | null;
  timestamp: string;
  status_code: number | null;
  response_time_ms: number | null;
  response_size_bytes: number | null;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
}

export interface CreateRequestRequest {
  collection_id?: number;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  body_type?: 'json' | 'form' | 'raw';
}

export interface SendRequestRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface SendRequestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  responseTime: number;
  responseSize: number;
}

export interface CreateEnvironmentRequest {
  name: string;
  variables: Record<string, string>;
  active?: boolean;
}
