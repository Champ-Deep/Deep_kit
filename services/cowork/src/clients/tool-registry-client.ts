import fetch from 'node-fetch';

export interface Tool {
  name: string;
  description: string;
  endpoint: string;
  methods: Record<string, { method: string; path?: string; params: string[] }>;
}

export class ToolRegistryClient {
  private tools: Tool[] = [];
  private registryPath: string;

  constructor(registryPath: string = '/app/tools-registry/tools.json') {
    this.registryPath = registryPath;
  }

  /**
   * Load tools from registry file
   */
  async loadTools(): Promise<Tool[]> {
    try {
      const fs = await import('fs');
      const data = fs.readFileSync(this.registryPath, 'utf-8');
      const registry = JSON.parse(data);
      this.tools = registry.tools || [];
      return this.tools;
    } catch (error) {
      console.error('Failed to load tools registry:', error);
      return [];
    }
  }

  /**
   * Get all available tools
   */
  getTools(): Tool[] {
    return this.tools;
  }

  /**
   * Get tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.find(t => t.name === name);
  }

  /**
   * Execute a tool method
   */
  async executeTool(name: string, methodName: string, args: any): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    const method = tool.methods[methodName];
    if (!method) {
      throw new Error(`Method not found: ${methodName} on tool ${name}`);
    }

    // Build endpoint URL
    const endpoint = method.path
      ? `${tool.endpoint}${method.path}`
      : tool.endpoint;

    // Execute request
    const options: any = {
      method: method.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (method.method !== 'GET') {
      options.body = JSON.stringify(args);
    }

    try {
      const response = await fetch(endpoint, options);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Tool execution failed: ${error}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`Tool execution error (${name}.${methodName}):`, error.message);
      throw error;
    }
  }
}
