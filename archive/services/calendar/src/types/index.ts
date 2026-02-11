export interface Event {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string | null;
  location: string | null;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: string;
  byweekday?: number[];
  bymonthday?: number[];
}

export interface Booking {
  id: number;
  event_id: number | null;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  booked_at: string;
  reminder_sent: boolean;
}

export interface Availability {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  color?: string;
  location?: string;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
  created_by?: string;
}

export interface CreateBookingRequest {
  event_id?: number;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
}

export interface CreateAvailabilityRequest {
  day_of_week: number;
  start_time: string;
  end_time: string;
}
