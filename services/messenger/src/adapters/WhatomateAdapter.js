const axios = require('axios');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * WhatomateAdapter - Self-hosted WhatsApp Business API integration
 *
 * Whatomate is a self-hosted WhatsApp Business API server (Go + Vue, AGPL-3.0)
 * that handles Meta Cloud API transport. The agent focuses on intelligence,
 * not protocol handling.
 *
 * Event Flow:
 * WhatsApp User -> Meta Cloud API -> Whatomate -> webhook POST -> Agent Core
 * Agent Core -> REST API -> Whatomate -> Meta Cloud API -> WhatsApp User
 */
class WhatomateAdapter {
  constructor(config = {}) {
    this.config = config;
    this.baseURL = config.baseURL || process.env.WHATOMATE_URL || 'http://whatomate:8080';
    this.apiKey = config.apiKey || process.env.WHATOMATE_API_KEY;
    this.timeout = config.timeout || 30000;

    // Create axios instance with defaults
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      }
    });

    logger.info('WhatomateAdapter initialized', { baseURL: this.baseURL });
  }

  /**
   * Parse incoming Whatomate webhook payload
   *
   * Whatomate forwards WhatsApp Cloud API messages with this structure:
   * {
   *   "object": "whatsapp_business_account",
   *   "entry": [{
   *     "id": "BUSINESS_ACCOUNT_ID",
   *     "changes": [{
   *       "value": {
   *         "messaging_product": "whatsapp",
   *         "metadata": { "display_phone_number": "...", "phone_number_id": "..." },
   *         "contacts": [{ "profile": { "name": "..." }, "wa_id": "..." }],
   *         "messages": [{
   *           "from": "SENDER_PHONE",
   *           "id": "MESSAGE_ID",
   *           "timestamp": "...",
   *           "text": { "body": "..." },
   *           "type": "text"
   *         }]
   *       }
   *     }]
   *   }]
   * }
   *
   * @param {Object} rawMessage - Whatomate webhook payload
   * @returns {Object} Normalized message
   */
  async parseMessage(rawMessage) {
    // Handle direct Whatomate format (simplified)
    if (rawMessage.message_id && rawMessage.from) {
      return this._parseSimplifiedFormat(rawMessage);
    }

    // Handle full WhatsApp Cloud API webhook format
    if (rawMessage.object === 'whatsapp_business_account' && rawMessage.entry) {
      return this._parseCloudAPIFormat(rawMessage);
    }

    throw new Error('Unknown Whatomate message format');
  }

  /**
   * Parse simplified Whatomate format
   */
  _parseSimplifiedFormat(rawMessage) {
    return {
      id: rawMessage.message_id,
      sender: rawMessage.from,
      content: rawMessage.text?.body || rawMessage.body || '',
      timestamp: rawMessage.timestamp
        ? new Date(rawMessage.timestamp * 1000).toISOString()
        : new Date().toISOString(),
      metadata: {
        channel: 'whatsapp',
        platform: 'whatomate',
        phoneNumberId: rawMessage.phone_number_id,
        messageType: rawMessage.type || 'text'
      }
    };
  }

  /**
   * Parse WhatsApp Cloud API webhook format
   */
  _parseCloudAPIFormat(rawMessage) {
    const entry = rawMessage.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value || !value.messages || value.messages.length === 0) {
      throw new Error('No messages in webhook payload');
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    return {
      id: message.id,
      sender: message.from,
      content: this._extractMessageContent(message),
      timestamp: message.timestamp
        ? new Date(parseInt(message.timestamp) * 1000).toISOString()
        : new Date().toISOString(),
      metadata: {
        channel: 'whatsapp',
        platform: 'whatomate',
        phoneNumberId: value.metadata?.phone_number_id,
        displayPhoneNumber: value.metadata?.display_phone_number,
        profileName: contact?.profile?.name || 'Unknown',
        waId: contact?.wa_id,
        messageType: message.type
      }
    };
  }

  /**
   * Extract message content based on type
   */
  _extractMessageContent(message) {
    switch (message.type) {
      case 'text':
        return message.text?.body || '';
      case 'image':
        return `[Image: ${message.image?.caption || 'No caption'}]`;
      case 'document':
        return `[Document: ${message.document?.filename || 'Unknown'}]`;
      case 'audio':
        return '[Audio message]';
      case 'video':
        return `[Video: ${message.video?.caption || 'No caption'}]`;
      case 'location':
        return `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
      case 'contacts':
        return `[Contact shared]`;
      case 'interactive':
        return message.interactive?.button_reply?.title ||
               message.interactive?.list_reply?.title ||
               '[Interactive response]';
      default:
        return `[${message.type} message]`;
    }
  }

  /**
   * Send WhatsApp message via Whatomate API
   *
   * @param {string} recipientId - WhatsApp phone number (e.g., '1234567890')
   * @param {string} message - Message text
   * @param {Object} options - Additional options
   * @returns {Object} Send result
   */
  async send(recipientId, message, options = {}) {
    // Clean phone number (remove whatsapp: prefix if present)
    const to = recipientId.replace(/^whatsapp:/, '');

    logger.info(`Sending WhatsApp message via Whatomate to ${to}`);

    try {
      // Text message payload
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: options.previewUrl || false,
          body: message
        }
      };

      // Use template if specified
      if (options.template) {
        payload.type = 'template';
        payload.template = options.template;
        delete payload.text;
      }

      const response = await this.client.post('/api/send', payload);

      logger.info('WhatsApp message sent via Whatomate', {
        messageId: response.data?.messages?.[0]?.id,
        to
      });

      return {
        success: true,
        messageId: response.data?.messages?.[0]?.id,
        to,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to send WhatsApp message via Whatomate:', error.message);

      // Extract error details from response
      const errorDetails = error.response?.data?.error || error.message;

      throw new Error(`Whatomate send failed: ${JSON.stringify(errorDetails)}`);
    }
  }

  /**
   * Send interactive message with buttons
   *
   * @param {string} recipientId - WhatsApp phone number
   * @param {string} body - Message body text
   * @param {Array} buttons - Array of button objects { id, title }
   * @param {Object} options - Additional options
   */
  async sendButtons(recipientId, body, buttons, options = {}) {
    const to = recipientId.replace(/^whatsapp:/, '');

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map((btn, idx) => ({
            type: 'reply',
            reply: {
              id: btn.id || `btn_${idx}`,
              title: btn.title.substring(0, 20) // Max 20 chars
            }
          }))
        }
      }
    };

    if (options.header) {
      payload.interactive.header = { type: 'text', text: options.header };
    }
    if (options.footer) {
      payload.interactive.footer = { text: options.footer };
    }

    const response = await this.client.post('/api/send', payload);

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      to
    };
  }

  /**
   * Send list message with options
   *
   * @param {string} recipientId - WhatsApp phone number
   * @param {string} body - Message body text
   * @param {string} buttonText - Button text to open list
   * @param {Array} sections - Array of section objects with rows
   */
  async sendList(recipientId, body, buttonText, sections, options = {}) {
    const to = recipientId.replace(/^whatsapp:/, '');

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body },
        action: {
          button: buttonText.substring(0, 20),
          sections: sections.map(section => ({
            title: section.title,
            rows: section.rows.map(row => ({
              id: row.id,
              title: row.title.substring(0, 24),
              description: row.description?.substring(0, 72)
            }))
          }))
        }
      }
    };

    if (options.header) {
      payload.interactive.header = { type: 'text', text: options.header };
    }
    if (options.footer) {
      payload.interactive.footer = { text: options.footer };
    }

    const response = await this.client.post('/api/send', payload);

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      to
    };
  }

  /**
   * Mark message as read
   *
   * @param {string} messageId - WhatsApp message ID to mark as read
   */
  async markAsRead(messageId) {
    try {
      await this.client.post('/api/messages', {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      });
      return true;
    } catch (error) {
      logger.warn('Failed to mark message as read:', error.message);
      return false;
    }
  }

  /**
   * Format a response message for WhatsApp
   *
   * @param {Object} result - Operation result
   * @returns {string} Formatted message
   */
  formatResponse(result) {
    if (!result) {
      return 'Done';
    }

    if (typeof result === 'string') {
      return result;
    }

    if (result.type === 'email') {
      return `Email sent to ${result.to}\nSubject: ${result.subject}`;
    }

    if (result.type === 'slack') {
      return `Posted to Slack ${result.channel}`;
    }

    if (result.type === 'task_created') {
      const lines = ['Task created'];
      if (result.context) lines.push(`Context: ${result.context}`);
      if (result.title) lines.push(`Title: ${result.title}`);
      return lines.join('\n');
    }

    if (result.type === 'note_created') {
      const lines = ['Note created'];
      if (result.context) lines.push(`Context: ${result.context}`);
      return lines.join('\n');
    }

    if (result.type === 'content_analyzed') {
      const lines = ['Content analyzed'];
      if (result.contexts && result.contexts.length > 0) {
        lines.push(`\nSaved to: ${result.contexts.map(c => c.contextName).join(', ')}`);
      }
      return lines.join('\n');
    }

    if (result.response) {
      return result.response;
    }

    return result.message || 'Done';
  }

  /**
   * Check Whatomate service health
   *
   * @returns {Object} Health status
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return {
        status: 'healthy',
        connected: true,
        baseURL: this.baseURL,
        details: response.data
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        baseURL: this.baseURL,
        error: error.message
      };
    }
  }
}

module.exports = { WhatomateAdapter };
