import fetch from 'node-fetch';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://ollama:11434', model: string = 'llama3.2') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  /**
   * Build system prompt with available tools
   */
  private buildSystemPrompt(tools: any[]): string {
    const toolDescriptions = tools
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');

    return `You are DeepKit Co-Work, a sovereign AI assistant for B2B automation and productivity.

You have access to the following tools:
${toolDescriptions}

Guidelines:
1. Privacy-first: All data stays local or on private infrastructure
2. Tool-aware: Use appropriate tools for each task
3. B2B focused: Optimize for sales, marketing, recruitment workflows
4. Action-oriented: Generate concrete, executable outputs

When you need to use a tool, respond with:
[TOOL: tool_name, args: {"param": "value"}]

Example:
User: "Send an email to john@example.com"
You: "I'll send that email for you. [TOOL: champmail, args: {"to": "john@example.com", "subject": "...", "html": "..."}]"

Be conversational and helpful. Always explain what you're doing.`;
  }

  /**
   * Generate streaming response from Ollama
   */
  async *generateStream(
    messages: Message[],
    tools: any[] = []
  ): AsyncGenerator<string, void, unknown> {
    const systemPrompt = this.buildSystemPrompt(tools);

    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      options: {
        temperature: 0.7,
        num_ctx: 32768,
        top_k: 40,
        top_p: 0.9,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const chunk = JSON.parse(line);
            if (chunk.message?.content) {
              yield chunk.message.content;
            }
          } catch (e) {
            console.error('Failed to parse Ollama chunk:', e);
          }
        }
      }
    } catch (error: any) {
      console.error('Ollama generation error:', error);
      throw error;
    }
  }

  /**
   * Check if Ollama is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Parse tool calls from AI response
   */
  parseToolCalls(text: string): Array<{ name: string; args: any }> {
    const toolPattern = /\[TOOL:\s*(\w+),\s*args:\s*({[^}]+})\]/g;
    const tools: Array<{ name: string; args: any }> = [];
    let match;

    while ((match = toolPattern.exec(text)) !== null) {
      try {
        const name = match[1];
        const args = JSON.parse(match[2]);
        tools.push({ name, args });
      } catch (e) {
        console.error('Failed to parse tool call:', e);
      }
    }

    return tools;
  }
}
