import { BaseAdapter } from './base';
import { GatewayMessage, ChannelType } from '../types';
import WebSocket from 'ws';

export class WebAdapter extends BaseAdapter {
  readonly channel = 'web' as const;
  private wss: WebSocket.Server;
  private clients: Map<string, WebSocket> = new Map();

  constructor(port: number = 3334) {
    super();
    this.wss = new WebSocket.Server({ port });
    console.log(`🌐 WebSocket server initialized on port ${port}`);
  }

  async initialize(): Promise<void> {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateMessageId();
      this.clients.set(clientId, ws);
      
      console.log(`✅ Web client connected: ${clientId}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        message: 'Connected to DeepKit Gateway'
      }));

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());
          const message = this.normalizeMessage(clientId, parsed);
          
          if (this.messageHandler) {
            this.messageHandler(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        console.log(`👋 Web client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });
    });

    console.log('✅ Web adapter initialized');
  }

  async sendMessage(clientId: string, text: string, metadata?: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`Web client ${clientId} not found`);
      return;
    }

    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'message',
        text,
        metadata,
        timestamp: new Date().toISOString()
      }));
    }
  }

  broadcast(text: string, metadata?: any): void {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'broadcast',
          text,
          metadata,
          timestamp: new Date().toISOString()
        }));
      }
    });
  }

  private normalizeMessage(clientId: string, data: any): GatewayMessage {
    return {
      id: this.generateMessageId(),
      channel: this.channel,
      userId: clientId,
      text: this.normalizeText(data.text || data.message || ''),
      metadata: {
        chatId: clientId,
        sessionId: data.sessionId,
        raw: data
      },
      timestamp: new Date()
    };
  }
}
