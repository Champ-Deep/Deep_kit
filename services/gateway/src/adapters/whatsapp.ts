import { BaseAdapter } from './base';
import { GatewayMessage, ChannelType } from '../types';

interface WhatsAppMessage {
  from: string;
  body: string;
  profileName?: string;
  timestamp?: number;
  messageId?: string;
}

export class WhatsAppAdapter extends BaseAdapter {
  readonly channel = 'whatsapp' as const;
  private webhookURL: string;
  private n8nWebhookURL: string;

  constructor() {
    super();
    this.webhookURL = process.env.WHATSAPP_WEBHOOK_URL || '';
    this.n8nWebhookURL = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/whatsapp';
    
    if (!this.n8nWebhookURL) {
      console.warn('⚠️ N8N_WEBHOOK_URL not set - WhatsApp replies will not work');
    }
  }

  async initialize(): Promise<void> {
    console.log('✅ WhatsApp adapter initialized (webhook mode)');
    console.log(`   Webhook endpoint: POST http://gateway:3333/webhook/whatsapp`);
    console.log(`   Reply endpoint: ${this.n8nWebhookURL}`);
  }

  // This method is called by the Gateway's Express webhook endpoint
  handleWebhook(data: any): GatewayMessage | null {
    try {
      // Support multiple WhatsApp integration formats
      // Format 1: Direct from Evolution API
      if (data.data?.message) {
        return this.parseEvolutionAPI(data);
      }
      
      // Format 2: From n8n webhook node
      if (data.body && data.from) {
        return this.parseN8NFormat(data);
      }
      
      // Format 3: Generic format
      if (data.message || data.text) {
        return this.parseGenericFormat(data);
      }

      console.warn('Unknown WhatsApp message format:', data);
      return null;
    } catch (error) {
      console.error('Error parsing WhatsApp webhook:', error);
      return null;
    }
  }

  async sendMessage(chatId: string, text: string, metadata?: any): Promise<void> {
    if (!this.n8nWebhookURL) {
      console.warn('Cannot send WhatsApp message: N8N_WEBHOOK_URL not configured');
      return;
    }

    try {
      const response = await fetch(this.n8nWebhookURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: chatId,
          message: text,
          ...metadata
        })
      });

      if (!response.ok) {
        console.error('Failed to send WhatsApp message:', await response.text());
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    }
  }

  private parseEvolutionAPI(data: any): GatewayMessage {
    const message = data.data.message;
    
    return {
      id: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channel: this.channel,
      userId: message.remoteJid || data.data.key.remoteJid,
      text: this.normalizeText(message.conversation || message.extendedTextMessage?.text || ''),
      metadata: {
        chatId: message.remoteJid || data.data.key.remoteJid,
        messageId: data.data.key.id,
        raw: data
      },
      timestamp: new Date(data.data.messageTimestamp * 1000)
    };
  }

  private parseN8NFormat(data: WhatsAppMessage): GatewayMessage {
    return {
      id: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channel: this.channel,
      userId: data.from,
      text: this.normalizeText(data.body),
      metadata: {
        chatId: data.from,
        username: data.profileName,
        messageId: data.messageId,
        raw: data
      },
      timestamp: data.timestamp ? new Date(data.timestamp * 1000) : new Date()
    };
  }

  private parseGenericFormat(data: any): GatewayMessage {
    return {
      id: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channel: this.channel,
      userId: data.from || data.userId || 'unknown',
      text: this.normalizeText(data.message || data.text || ''),
      metadata: {
        chatId: data.from || data.userId || 'unknown',
        raw: data
      },
      timestamp: new Date()
    };
  }
}
