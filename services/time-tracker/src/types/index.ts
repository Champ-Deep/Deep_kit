export interface Project {
  id: number;
  name: string;
  default_hourly_rate: number | null;
  created_at: string;
}

export interface TimeEntry {
  id: number;
  task_id: number | null;
  project_id: number | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  is_billable: boolean;
  hourly_rate: number | null;
  total_amount: number | null;
  created_at: string;
}

export interface Timer {
  id: number;
  task_id: number | null;
  project_id: number | null;
  description: string | null;
  start_time: string;
  created_at: string;
}

export interface CreateProjectRequest {
  name: string;
  default_hourly_rate?: number;
}

export interface CreateTimeEntryRequest {
  task_id?: number;
  project_id?: number;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  is_billable?: boolean;
  hourly_rate?: number;
}

export interface StartTimerRequest {
  task_id?: number;
  project_id?: number;
  description?: string;
}

export interface TimeSummary {
  totalSeconds: number;
  totalFormatted: string;
  billableSeconds: number;
  billableFormatted: string;
  totalAmount: number;
  entries: number;
}
