import { Telegraf, Context } from 'telegraf';
import { BaseAdapter } from './base';
import { GatewayMessage } from '../types';

export class TelegramAdapter extends BaseAdapter {
  readonly channel = 'telegram' as const;
  private bot: Telegraf<Context>;
  private botToken: string;

  constructor() {
    super();
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!this.botToken) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN not set - Telegram adapter disabled');
    }
    this.bot = new Telegraf(this.botToken);
  }

  async initialize(): Promise<void> {
    if (!this.botToken) {
      console.log('⏭️ Skipping Telegram initialization (no token)');
      return;
    }

    // Handle text messages
    this.bot.on('text', async (ctx: Context) => {
      const message = this.normalizeMessage(ctx);
      if (this.messageHandler) {
        this.messageHandler(message);
      }
    });

    // Handle commands
    this.bot.command('start', async (ctx: Context) => {
      await ctx.reply('🚀 DeepKit Gateway connected! Send me any message to get started.');
    });

    this.bot.command('help', async (ctx: Context) => {
      await ctx.reply(`
🤖 DeepKit Assistant Commands:
/start - Start the bot
/help - Show this help message
/status - Check service status

Just send a message and I'll help you manage your tasks!
      `.trim());
    });

    this.bot.command('status', async (ctx: Context) => {
      await ctx.reply('✅ All systems operational');
    });

    // Start bot
    await this.bot.launch();
    console.log('✅ Telegram adapter initialized');

    // Enable graceful stop
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  async sendMessage(chatId: string, text: string, metadata?: any): Promise<void> {
    if (!this.botToken) return;
    
    try {
      await this.bot.telegram.sendMessage(chatId, text, {
        parse_mode: metadata?.parseMode || 'HTML',
        reply_to_message_id: metadata?.replyToMessageId
      });
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
    }
  }

  private normalizeMessage(ctx: Context): GatewayMessage {
    const msg = ctx.message;
    const chat = ctx.chat;
    const from = ctx.from;

    if (!msg || !chat || !from) {
      throw new Error('Invalid message context');
    }

    return {
      id: this.generateMessageId(),
      channel: this.channel,
      userId: from.id.toString(),
      text: this.normalizeText(msg.text || ''),
      metadata: {
        chatId: chat.id.toString(),
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        isGroup: chat.type === 'group' || chat.type === 'supergroup',
        replyToMessageId: msg.reply_to_message?.message_id?.toString(),
        raw: msg
      },
      timestamp: new Date(msg.date * 1000)
    };
  }
}
