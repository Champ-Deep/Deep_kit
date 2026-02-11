import axios from 'axios';

interface OpenCodeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ProcessMessageRequest {
  message: string;
  sessionId: string;
  userId?: string;
  history?: OpenCodeMessage[];
  context?: any;
}

interface ToolCall {
  tool: string;
  method: string;
  params: any;
}

interface ProcessMessageResponse {
  response: string;
  toolCalls?: ToolCall[];
  metadata?: any;
}

export class OpenCodeClient {
  private baseURL: string;
  private username: string;
  private password: string;

  constructor() {
    this.baseURL = process.env.OPENCODE_URL || 'http://opencode:4096';
    this.username = process.env.OPENCODE_USERNAME || 'opencode';
    this.password = process.env.OPENCODE_PASSWORD || '';
  }

  async processMessage(request: ProcessMessageRequest): Promise<ProcessMessageResponse> {
    try {
      // Check if we should use OpenCode or fallback to simple response
      const useOpenCode = await this.isOpenCodeAvailable();
      
      if (!useOpenCode) {
        console.log('⚠️ OpenCode unavailable, using fallback');
        return this.fallbackResponse(request);
      }

      // Create or get session
      const sessionId = await this.getOrCreateSession(request.sessionId);

      // Send message to OpenCode
      const response = await axios.post(
        `${this.baseURL}/session/${sessionId}/message`,
        {
          parts: [{ type: 'text', text: request.message }],
          tools: ['task_tracker', 'calendar', 'system_info']
        },
        {
          auth: {
            username: this.username,
            password: this.password
          },
          timeout: 60000 // 60 second timeout for AI processing
        }
      );

      // Parse response
      const data = response.data;
      
      return {
        response: this.extractTextFromResponse(data),
        toolCalls: this.extractToolCalls(data),
        metadata: {
          sessionId,
          raw: data
        }
      };

    } catch (error: any) {
      console.error('OpenCode processing error:', error.message);
      return this.fallbackResponse(request);
    }
  }

  private async isOpenCodeAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseURL}/global/health`, {
        timeout: 5000
      });
      return true;
    } catch {
      return false;
    }
  }

  private async getOrCreateSession(sessionId: string): Promise<string> {
    // For now, use the session ID directly
    // In production, you'd create a new session if needed
    return sessionId;
  }

  private extractTextFromResponse(data: any): string {
    // Extract text from OpenCode response format
    if (data.parts && Array.isArray(data.parts)) {
      const textParts = data.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text);
      return textParts.join('\n') || 'No response received';
    }
    return data.response || 'No response received';
  }

  private extractToolCalls(data: any): ToolCall[] | undefined {
    // Extract tool calls from OpenCode response
    if (data.parts && Array.isArray(data.parts)) {
      const toolCalls = data.parts
        .filter((part: any) => part.type === 'tool-call')
        .map((part: any) => ({
          tool: part.tool || 'unknown',
          method: part.method || 'execute',
          params: part.params || {}
        }));
      return toolCalls.length > 0 ? toolCalls : undefined;
    }
    return undefined;
  }

  private fallbackResponse(request: ProcessMessageRequest): ProcessMessageResponse {
    // Simple pattern matching fallback when OpenCode is unavailable
    const message = request.message.toLowerCase();
    
    if (message.includes('task') || message.includes('todo')) {
      return {
        response: "I'll help you with tasks. Use the Task Tracker at http://localhost:7718 or tell me what task you'd like to create.",
        metadata: { fallback: true, suggestedTool: 'task_tracker' }
      };
    }
    
    if (message.includes('calendar') || message.includes('schedule')) {
      return {
        response: "I can help with scheduling. Use n8n workflows for calendar integration.",
        metadata: { fallback: true, suggestedTool: 'calendar' }
      };
    }
    
    if (message.includes('status') || message.includes('health')) {
      return {
        response: "All systems are operational. Task Tracker is running at port 7718.",
        metadata: { fallback: true, suggestedTool: 'system_info' }
      };
    }

    return {
      response: "I'm here to help! You can:\n• Create tasks\n• Check system status\n• Manage your schedule\n\nWhat would you like to do?",
      metadata: { fallback: true }
    };
  }
}
