const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://ollama:11434';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT || '300000', 10); // 5 minutes

export interface OllamaRequest {
  model: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
  tools?: any[];
}

export interface OllamaResponse {
  response?: string;
  message?: {
    role: string;
    content: string;
    tool_calls?: Array<{
      function: {
        name: string;
        arguments: any;
      };
    }>;
  };
}

export interface OllamaChatOptions {
  model?: string;
  tools?: any[];
  systemPrompt?: string;
}

/**
 * Make a fetch request to Ollama with extended timeout.
 * Uses http/https modules directly to avoid undici headersTimeout issues.
 */
const ollamaFetch = async (url: string, body: any): Promise<any> => {
  const { default: http } = await import('http');
  const { default: https } = await import('https');
  const parsedUrl = new URL(url);
  const transport = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = transport.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: OLLAMA_TIMEOUT,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error(`Invalid JSON response from Ollama: ${data.substring(0, 200)}`));
            }
          } else {
            reject(new Error(`Ollama request failed: HTTP ${res.statusCode} ${res.statusMessage}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Ollama request timed out after ${OLLAMA_TIMEOUT}ms`));
    });
    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
};

/**
 * Chat with Ollama using messages API (supports function calling)
 */
export const chatWithTools = async (
  userMessage: string,
  options: OllamaChatOptions = {}
): Promise<OllamaResponse> => {
  const { model = 'llama3.2', tools, systemPrompt } = options;

  try {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: userMessage });

    const body: any = {
      model,
      messages,
      stream: false
    };

    // Add tools if provided and model supports them
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    console.log(`Sending request to Ollama at ${OLLAMA_HOST}/api/chat (timeout: ${OLLAMA_TIMEOUT}ms)`);
    const data = await ollamaFetch(`${OLLAMA_HOST}/api/chat`, body) as OllamaResponse;
    return data;
  } catch (error) {
    console.error('Ollama chat error:', error);
    return {
      message: {
        role: 'assistant',
        content: 'Sorry, I encountered an error communicating with the AI model. Please try again - the model may need time to warm up.'
      }
    };
  }
};

/**
 * Legacy chat function for backwards compatibility
 */
export const chat = async (prompt: string, model: string = 'llama3.2'): Promise<string> => {
  try {
    console.log(`Sending generate request to Ollama at ${OLLAMA_HOST}/api/generate (timeout: ${OLLAMA_TIMEOUT}ms)`);
    const data = await ollamaFetch(`${OLLAMA_HOST}/api/generate`, {
      model,
      prompt,
      stream: false
    }) as OllamaResponse;
    return data.response || '';
  } catch (error) {
    console.error('Ollama generate error:', error);
    return 'Sorry, I encountered an error communicating with the AI model.';
  }
};

/**
 * Extract tool calls from LLM response using multiple patterns
 * Supports:
 * 1. TOOL_CALL: tool_name.method_name(params)
 * 2. JSON: {"name": "tool_name.method_name", "parameters": {...}}
 * 3. JSON: {"name": "tool_name_method_name", "parameters": {...}}
 */
export const extractToolCallsFromText = (text: string): Array<{ tool: string; method: string; params: any }> => {
  const toolCalls: Array<{ tool: string; method: string; params: any }> = [];

  // Pattern 1: TOOL_CALL: tool_name.method_name(params)
  const pattern = /TOOL_CALL:\s*(\w+)\.(\w+)\(([^)]*)\)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const [, toolName, methodName, paramsStr] = match;
    try {
      const params = paramsStr.trim() ? JSON.parse(`{${paramsStr}}`) : {};
      toolCalls.push({ tool: toolName, method: methodName, params });
    } catch (error) {
      console.warn(`Failed to parse tool call params: ${paramsStr}`);
    }
  }

  // Pattern 2: JSON format - try to extract JSON objects with "name" and "parameters"
  if (toolCalls.length === 0) {
    // Find JSON objects in the text
    const jsonPattern = /\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"parameters"\s*:\s*(\{[^{}]*\})[^{}]*\}/g;
    let jsonMatch;

    while ((jsonMatch = jsonPattern.exec(text)) !== null) {
      const [, funcName, paramsStr] = jsonMatch;
      try {
        const params = JSON.parse(paramsStr);
        // Parse "tool_name.method_name" or "tool_name_method_name"
        let toolName: string;
        let methodName: string;
        if (funcName.includes('.')) {
          [toolName, methodName] = funcName.split('.', 2);
        } else {
          // Split on last underscore: "task_tracker_create_task" -> "task_tracker", "create_task"
          // Try common tool names first
          const knownTools = ['task_tracker', 'calendar', 'qr_generator', 'time_tracker'];
          let found = false;
          for (const tool of knownTools) {
            if (funcName.startsWith(tool + '_')) {
              toolName = tool;
              methodName = funcName.slice(tool.length + 1);
              found = true;
              break;
            }
          }
          if (!found) {
            const parts = funcName.split('_');
            methodName = parts.pop()!;
            toolName = parts.join('_');
          }
        }
        toolCalls.push({ tool: toolName!, method: methodName!, params });
      } catch (error) {
        console.warn(`Failed to parse JSON tool call: ${paramsStr}`);
      }
    }

    // Also try parsing the entire text as JSON
    if (toolCalls.length === 0) {
      try {
        const parsed = JSON.parse(text.trim());
        if (parsed.name && typeof parsed.name === 'string') {
          const params = parsed.parameters || parsed.arguments || parsed.params || {};
          let toolName: string;
          let methodName: string;
          if (parsed.name.includes('.')) {
            [toolName, methodName] = parsed.name.split('.', 2);
          } else {
            const knownTools = ['task_tracker', 'calendar', 'qr_generator', 'time_tracker'];
            let found = false;
            for (const tool of knownTools) {
              if (parsed.name.startsWith(tool + '_')) {
                toolName = tool;
                methodName = parsed.name.slice(tool.length + 1);
                found = true;
                break;
              }
            }
            if (!found) {
              const parts = parsed.name.split('_');
              methodName = parts.pop()!;
              toolName = parts.join('_');
            }
          }
          toolCalls.push({ tool: toolName!, method: methodName!, params });
        }
      } catch {
        // Not valid JSON, ignore
      }
    }
  }

  return toolCalls;
};

export const isOllamaAvailable = async (): Promise<boolean> => {
  try {
    const { default: http } = await import('http');
    const { default: https } = await import('https');
    const parsedUrl = new URL(`${OLLAMA_HOST}/api/tags`);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      const req = transport.get(
        { hostname: parsedUrl.hostname, port: parsedUrl.port, path: parsedUrl.pathname, timeout: 5000 },
        (res) => { resolve(res.statusCode === 200); }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  } catch {
    return false;
  }
};
