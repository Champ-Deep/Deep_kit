"use strict";
/**
 * Standard DeepKit event type constants.
 * All services should use these constants when publishing/subscribing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIREHOSE = exports.AUDIT_ACTION = exports.SERVICE_STOPPED = exports.SERVICE_STARTED = exports.WEBHOOK_FAILED = exports.WEBHOOK_TRIGGERED = exports.TIME_ENTRY_STOPPED = exports.TIME_ENTRY_STARTED = exports.EMAIL_RECEIVED = exports.EMAIL_FAILED = exports.EMAIL_SENT = exports.CONTACT_ADDED = exports.CAMPAIGN_UPDATED = exports.CAMPAIGN_CREATED = exports.EVENT_DELETED = exports.EVENT_REMINDER = exports.EVENT_UPDATED = exports.EVENT_CREATED = exports.PAYMENT_RECEIVED = exports.INVOICE_PAID = exports.INVOICE_UPDATED = exports.INVOICE_CREATED = exports.TASK_DELETED = exports.TASK_COMPLETED = exports.TASK_UPDATED = exports.TASK_CREATED = void 0;
// Task Tracker
exports.TASK_CREATED = 'TASK_CREATED';
exports.TASK_UPDATED = 'TASK_UPDATED';
exports.TASK_COMPLETED = 'TASK_COMPLETED';
exports.TASK_DELETED = 'TASK_DELETED';
// Invoicing
exports.INVOICE_CREATED = 'INVOICE_CREATED';
exports.INVOICE_UPDATED = 'INVOICE_UPDATED';
exports.INVOICE_PAID = 'INVOICE_PAID';
exports.PAYMENT_RECEIVED = 'PAYMENT_RECEIVED';
// Calendar
exports.EVENT_CREATED = 'EVENT_CREATED';
exports.EVENT_UPDATED = 'EVENT_UPDATED';
exports.EVENT_REMINDER = 'EVENT_REMINDER';
exports.EVENT_DELETED = 'EVENT_DELETED';
// Marketing360
exports.CAMPAIGN_CREATED = 'CAMPAIGN_CREATED';
exports.CAMPAIGN_UPDATED = 'CAMPAIGN_UPDATED';
exports.CONTACT_ADDED = 'CONTACT_ADDED';
// ChampMail
exports.EMAIL_SENT = 'EMAIL_SENT';
exports.EMAIL_FAILED = 'EMAIL_FAILED';
exports.EMAIL_RECEIVED = 'EMAIL_RECEIVED';
// Time Tracker
exports.TIME_ENTRY_STARTED = 'TIME_ENTRY_STARTED';
exports.TIME_ENTRY_STOPPED = 'TIME_ENTRY_STOPPED';
// Webhook Manager
exports.WEBHOOK_TRIGGERED = 'WEBHOOK_TRIGGERED';
exports.WEBHOOK_FAILED = 'WEBHOOK_FAILED';
// System / Audit
exports.SERVICE_STARTED = 'SERVICE_STARTED';
exports.SERVICE_STOPPED = 'SERVICE_STOPPED';
exports.AUDIT_ACTION = 'AUDIT_ACTION';
// Firehose (subscribe to all)
exports.FIREHOSE = '*';
