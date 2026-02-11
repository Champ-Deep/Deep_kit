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
 * MessageBroker - Channel-agnostic messaging system
 *
 * Handles message normalization across different channels (WhatsApp, CLI, etc.)
 * Each channel has an adapter that implements: send(), receive(), parseMessage()
 */
class MessageBroker {
  constructor(config = {}) {
    this.channels = new Map(); // channelId → ChannelAdapter
    this.config = config;
    logger.info('MessageBroker initialized');
  }

  /**
   * Register a channel adapter
   * @param {string} channelId - Unique identifier for the channel
   * @param {Object} adapter - Adapter implementing send(), receive(), parseMessage()
   */
  registerChannel(channelId, adapter) {
    if (!adapter.send || !adapter.parseMessage) {
      throw new Error(`Adapter for ${channelId} must implement send() and parseMessage()`);
    }

    this.channels.set(channelId, adapter);
    logger.info(`Channel registered: ${channelId}`);
  }

  /**
   * Unregister a channel
   * @param {string} channelId
   */
  unregisterChannel(channelId) {
    this.channels.delete(channelId);
    logger.info(`Channel unregistered: ${channelId}`);
  }

  /**
   * Process incoming message from any channel
   * @param {string} channelId - The channel this message came from
   * @param {Object} rawMessage - Raw message from the channel (format varies)
   * @returns {Object} Normalized message format
   */
  async processMessage(channelId, rawMessage) {
    const adapter = this.channels.get(channelId);
    if (!adapter) {
      throw new Error(`No adapter registered for channel: ${channelId}`);
    }

    try {
      const normalized = await adapter.parseMessage(rawMessage);

      // Validate normalized format
      if (!normalized.id || !normalized.sender || !normalized.content) {
        throw new Error('Adapter must return message with id, sender, and content');
      }

      const message = {
        id: normalized.id,
        sender: normalized.sender,
        content: normalized.content,
        timestamp: normalized.timestamp || new Date().toISOString(),
        metadata: normalized.metadata || {},
        channel: channelId
      };

      logger.info(`Message processed from ${channelId}: ${message.id}`);
      return message;

    } catch (error) {
      logger.error(`Error processing message from ${channelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send response to a channel
   * @param {string} channelId - The channel to send to
   * @param {string} recipientId - Who to send to (phone number, user ID, etc.)
   * @param {string} message - The message to send
   * @param {Object} options - Additional options for sending
   * @returns {Object} Send result from adapter
   */
  async sendResponse(channelId, recipientId, message, options = {}) {
    const adapter = this.channels.get(channelId);
    if (!adapter) {
      throw new Error(`No adapter registered for channel: ${channelId}`);
    }

    try {
      const result = await adapter.send(recipientId, message, options);
      logger.info(`Response sent via ${channelId} to ${recipientId}`);
      return result;

    } catch (error) {
      logger.error(`Error sending response via ${channelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get list of registered channels
   * @returns {Array} Array of channel IDs
   */
  getChannels() {
    return Array.from(this.channels.keys());
  }

  /**
   * Check if a channel is registered
   * @param {string} channelId
   * @returns {boolean}
   */
  hasChannel(channelId) {
    return this.channels.has(channelId);
  }
}

module.exports = { MessageBroker };
