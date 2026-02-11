export interface ToolMethod {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params: (string | { name: string; optional?: boolean })[];
  path?: string; // Optional custom path (overrides base endpoint)
}

export interface Tool {
  name: string;
  description: string;
  endpoint: string;
  methods: {
    [key: string]: ToolMethod;
  };
}

export interface ToolRegistry {
  tools: Tool[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any;
  timestamp: number;
}

export interface Conversation {
  id: number;
  user_id: string | null;
  started_at: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: number;
}

export interface ChatResponse {
  response: string;
  conversationId: number;
  toolCalls?: any[];
}

export interface ToolCall {
  tool: string;
  method: string;
  params: Record<string, any>;
}

export interface AgentResponse {
  response: string;
  toolCalls: ToolCall[];
  executionLog: Array<{
    tool: string;
    method: string;
    params: any;
    result: any;
    success: boolean;
    executionTime: number;
  }>;
}
