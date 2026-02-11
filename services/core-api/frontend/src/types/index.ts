export interface Service {
  name: string;
  port: number;
  status: 'online' | 'offline' | 'unknown';
  description: string;
  category: 'core' | 'ai' | 'data' | 'automation';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  actions?: any[];
  metadata?: any;
}

export interface HardwareMetrics {
  cpu: number;
  memory: number;
  disk: number;
  timestamp: Date;
}
