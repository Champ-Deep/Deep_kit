/**
 * Standard DeepKit event type constants.
 * All services should use these constants when publishing/subscribing.
 */

// Task Tracker
export const TASK_CREATED = 'TASK_CREATED';
export const TASK_UPDATED = 'TASK_UPDATED';
export const TASK_COMPLETED = 'TASK_COMPLETED';
export const TASK_DELETED = 'TASK_DELETED';

// Invoicing
export const INVOICE_CREATED = 'INVOICE_CREATED';
export const INVOICE_UPDATED = 'INVOICE_UPDATED';
export const INVOICE_PAID = 'INVOICE_PAID';
export const PAYMENT_RECEIVED = 'PAYMENT_RECEIVED';

// Calendar
export const EVENT_CREATED = 'EVENT_CREATED';
export const EVENT_UPDATED = 'EVENT_UPDATED';
export const EVENT_REMINDER = 'EVENT_REMINDER';
export const EVENT_DELETED = 'EVENT_DELETED';

// Marketing360
export const CAMPAIGN_CREATED = 'CAMPAIGN_CREATED';
export const CAMPAIGN_UPDATED = 'CAMPAIGN_UPDATED';
export const CONTACT_ADDED = 'CONTACT_ADDED';

// ChampMail
export const EMAIL_SENT = 'EMAIL_SENT';
export const EMAIL_FAILED = 'EMAIL_FAILED';
export const EMAIL_RECEIVED = 'EMAIL_RECEIVED';

// Time Tracker
export const TIME_ENTRY_STARTED = 'TIME_ENTRY_STARTED';
export const TIME_ENTRY_STOPPED = 'TIME_ENTRY_STOPPED';

// Webhook Manager
export const WEBHOOK_TRIGGERED = 'WEBHOOK_TRIGGERED';
export const WEBHOOK_FAILED = 'WEBHOOK_FAILED';

// System / Audit
export const SERVICE_STARTED = 'SERVICE_STARTED';
export const SERVICE_STOPPED = 'SERVICE_STOPPED';
export const AUDIT_ACTION = 'AUDIT_ACTION';

// Firehose (subscribe to all)
export const FIREHOSE = '*';
