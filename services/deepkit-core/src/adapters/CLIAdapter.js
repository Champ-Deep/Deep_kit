const readline = require('readline');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('uuid');

/**
 * CLIAdapter - Command Line Interface adapter for local testing
 *
 * Allows sending messages via terminal and receiving responses
 * Perfect for testing the agent without external services
 */
class CLIAdapter {
  constructor(config = {}) {
    this.config = config;
    this.userId = config.userId || 'cli-user';
  }

  /**
   * Parse message from CLI
   * @param {Object} rawMessage - { text: string, user?: string }
   * @returns {Object} Normalized message
   */
  async parseMessage(rawMessage) {
    // If it's a string, wrap it
    if (typeof rawMessage === 'string') {
      rawMessage = { text: rawMessage };
    }

    const messageId = rawMessage.id || `cli-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: messageId,
      sender: rawMessage.user || this.userId,
      content: rawMessage.text || rawMessage.content,
      timestamp: new Date().toISOString(),
      metadata: {
        channel: 'cli',
        ...rawMessage.metadata
      }
    };
  }

  /**
   * Send message via CLI (print to console)
   * @param {string} recipientId - User ID (not used in CLI)
   * @param {string} message - Message to display
   * @param {Object} options - Additional options
   * @returns {Object} Send result
   */
  async send(recipientId, message, options = {}) {
    // Format output
    const timestamp = new Date().toISOString();
    const border = '─'.repeat(60);

    console.log('\n' + border);
    console.log(`🤖 Assistant Response (${timestamp})`);
    console.log(border);
    console.log(message);
    console.log(border + '\n');

    return {
      success: true,
      messageId: `cli-out-${Date.now()}`,
      timestamp,
      recipient: recipientId
    };
  }

  /**
   * Start interactive CLI session
   * @param {Function} messageHandler - Callback to handle messages
   */
  async startInteractive(messageHandler) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\n💬 You: '
    });

    console.log('\n' + '='.repeat(60));
    console.log('  DeepKit Agent Core - Interactive CLI');
    console.log('='.repeat(60));
    console.log('\nType your message and press Enter.');
    console.log('Commands: /exit, /quit, /help\n');

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();

      // Handle commands
      if (input === '/exit' || input === '/quit') {
        console.log('\n👋 Goodbye!');
        rl.close();
        return;
      }

      if (input === '/help') {
        console.log('\nAvailable commands:');
        console.log('  /exit, /quit - Exit the CLI');
        console.log('  /help        - Show this help');
        console.log('\nOr just type any message to chat with the assistant.\n');
        rl.prompt();
        return;
      }

      if (!input) {
        rl.prompt();
        return;
      }

      try {
        // Parse and handle message
        const normalized = await this.parseMessage({ text: input });
        await messageHandler(normalized);

      } catch (error) {
        console.error(`\n❌ Error: ${error.message}\n`);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      process.exit(0);
    });
  }
}

module.exports = { CLIAdapter };
