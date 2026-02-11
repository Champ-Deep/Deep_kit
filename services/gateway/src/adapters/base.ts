import { ChannelAdapter, GatewayMessage, ChannelType } from '../types';

export abstract class BaseAdapter implements ChannelAdapter {
  abstract readonly channel: ChannelType;
  protected messageHandler?: (message: GatewayMessage) => void;

  abstract initialize(): Promise<void>;
  abstract sendMessage(chatId: string, text: string, metadata?: any): Promise<void>;

  onMessage(handler: (message: GatewayMessage) => void): void {
    this.messageHandler = handler;
  }

  protected generateMessageId(): string {
    return `${this.channel}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected normalizeText(text: string): string {
    // Remove extra whitespace, normalize commands
    return text.trim().replace(/\s+/g, ' ');
  }
}
