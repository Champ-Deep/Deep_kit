"use strict";
/**
 * DeepKit Brain Tool Executor
 * Executes HTTP requests to DeepKit service endpoints with error handling and retries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolExecutor = exports.ToolExecutor = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const toolsRegistry = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../../tools-registry/tools.json'), 'utf-8'));
class ToolExecutor {
    constructor(timeout = 10000, maxRetries = 3) {
        this.tools = new Map();
        this.timeout = timeout;
        this.maxRetries = maxRetries;
        // Load tools from registry
        toolsRegistry.tools.forEach((tool) => {
            this.tools.set(tool.name, tool);
        });
        console.log(`🔧 Tool Executor initialized with ${this.tools.size} tools`);
    }
    /**
     * Get all available tools
     */
    getTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Get a specific tool by name
     */
    getTool(name) {
        return this.tools.get(name);
    }
    /**
     * Execute a tool method with parameters
     */
    async executeTool(toolName, methodName, params = {}) {
        const startTime = Date.now();
        const tool = this.tools.get(toolName);
        if (!tool) {
            return {
                success: false,
                error: `Tool '${toolName}' not found in registry`,
                executionTime: Date.now() - startTime
            };
        }
        const method = tool.methods[methodName];
        if (!method) {
            return {
                success: false,
                error: `Method '${methodName}' not found in tool '${toolName}'`,
                executionTime: Date.now() - startTime
            };
        }
        // Validate required parameters
        const missingParams = this.validateParams(method, params);
        if (missingParams.length > 0) {
            return {
                success: false,
                error: `Missing required parameters: ${missingParams.join(', ')}`,
                executionTime: Date.now() - startTime
            };
        }
        // Execute with retries
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await this.executeHttpRequest(tool, method, params);
                return {
                    success: true,
                    data: result,
                    executionTime: Date.now() - startTime
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Tool execution failed (attempt ${attempt}/${this.maxRetries}):`, errorMessage);
                if (attempt === this.maxRetries) {
                    return {
                        success: false,
                        error: `Failed after ${this.maxRetries} attempts: ${errorMessage}`,
                        executionTime: Date.now() - startTime
                    };
                }
                // Exponential backoff
                await this.sleep(Math.pow(2, attempt) * 100);
            }
        }
        return {
            success: false,
            error: 'Unexpected error - retry loop exited without result',
            executionTime: Date.now() - startTime
        };
    }
    /**
     * Execute HTTP request to service endpoint
     */
    async executeHttpRequest(tool, method, params) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const url = this.buildUrl(tool.endpoint, method, params);
            const options = {
                method: method.method,
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            };
            // Add body for POST/PUT/PATCH
            if (['POST', 'PUT', 'PATCH'].includes(method.method)) {
                options.body = JSON.stringify(params);
            }
            console.log(`🚀 Executing ${tool.name}.${method.method} ${url}`);
            const response = await fetch(url, options);
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.timeout}ms`);
            }
            throw error;
        }
    }
    /**
     * Build full URL with query parameters for GET requests
     */
    buildUrl(endpoint, method, params) {
        // Use custom path if specified, otherwise use endpoint
        const basePath = method.path || '';
        const baseUrl = endpoint + basePath;
        if (method.method === 'GET' && Object.keys(params).length > 0) {
            const queryParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, String(value));
                }
            });
            return `${baseUrl}?${queryParams.toString()}`;
        }
        return baseUrl;
    }
    /**
     * Validate that all required parameters are present
     */
    validateParams(method, params) {
        const missing = [];
        method.params.forEach(param => {
            // If param is a string, it's required
            if (typeof param === 'string') {
                if (params[param] === undefined || params[param] === null) {
                    missing.push(param);
                }
            }
        });
        return missing;
    }
    /**
     * Sleep utility for backoff
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Format tools for Ollama function calling
     * Converts our tool registry to OpenAI-compatible function definitions
     */
    getToolDefinitions() {
        const definitions = [];
        this.tools.forEach(tool => {
            Object.entries(tool.methods).forEach(([methodName, method]) => {
                definitions.push({
                    type: 'function',
                    function: {
                        name: `${tool.name}_${methodName}`,
                        description: `${tool.description} - ${methodName}`,
                        parameters: {
                            type: 'object',
                            properties: this.buildParameterSchema(method.params),
                            required: method.params.filter(p => typeof p === 'string')
                        }
                    }
                });
            });
        });
        return definitions;
    }
    /**
     * Build JSON schema for parameters
     */
    buildParameterSchema(params) {
        const properties = {};
        params.forEach(param => {
            const paramName = typeof param === 'string' ? param : param.name;
            properties[paramName] = {
                type: 'string',
                description: `The ${paramName} parameter`
            };
        });
        return properties;
    }
    /**
     * Parse tool call from function name (format: toolName_methodName)
     */
    parseToolCall(functionName) {
        const parts = functionName.split('_');
        if (parts.length < 2)
            return null;
        const methodName = parts.pop();
        const toolName = parts.join('_');
        return { toolName, methodName };
    }
}
exports.ToolExecutor = ToolExecutor;
// Singleton instance
exports.toolExecutor = new ToolExecutor();
