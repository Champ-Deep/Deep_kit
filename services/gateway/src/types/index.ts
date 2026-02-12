// Gateway Message Types - Universal format for all channels

export type ChannelType = 'telegram' | 'whatsapp' | 'web' | 'cli';

export interface GatewayMessage {
  id: string;
  channel: ChannelType;
  userId: string;
  text: string;
  metadata: MessageMetadata;
  timestamp: Date;
}

export interface MessageMetadata {
  chatId?: string;
  sessionId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isGroup?: boolean;
  replyToMessageId?: string;
  messageId?: string;
  raw?: any; // Original platform-specific data
}

export interface GatewayResponse {
  success: boolean;
  messageId: string;
  text: string;
  metadata?: any;
}

export interface Session {
  id: string;
  userId: string;
  channel: ChannelType;
  chatId: string;
  createdAt: Date;
  lastActivity: Date;
  context?: any;
}

// Channel Adapter Interface
export interface ChannelAdapter {
  readonly channel: ChannelType;
  initialize(): Promise<void>;
  sendMessage(chatId: string, text: string, metadata?: any): Promise<void>;
  onMessage(handler: (message: GatewayMessage) => void): void;
}

// Core API Client Types
export interface CoreAPIRequest {
  message: string;
  sessionId: string;
  userId: string;
  channel: ChannelType;
  context?: any;
}

export interface CoreAPIResponse {
  response: string;
  actions?: any[];
  metadata?: any;
}

export interface ToolCall {
  tool: string;
  method: string;
  params: any;
}
