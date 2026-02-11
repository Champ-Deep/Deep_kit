"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOllamaAvailable = exports.extractToolCallsFromText = exports.chat = exports.chatWithTools = void 0;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://ollama:11434';
/**
 * Chat with Ollama using messages API (supports function calling)
 */
const chatWithTools = async (userMessage, options = {}) => {
    const { model = 'llama3.2', tools, systemPrompt } = options;
    try {
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: userMessage });
        const body = {
            model,
            messages,
            stream: false
        };
        // Add tools if provided and model supports them
        if (tools && tools.length > 0) {
            body.tools = tools;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
        const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error('Ollama chat error:', error);
        return {
            message: {
                role: 'assistant',
                content: 'Sorry, I encountered an error communicating with the AI model.'
            }
        };
    }
};
exports.chatWithTools = chatWithTools;
/**
 * Legacy chat function for backwards compatibility
 */
const chat = async (prompt, model = 'llama3.2') => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
        const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false
            }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
        }
        const data = await response.json();
        return data.response || '';
    }
    catch (error) {
        console.error('Ollama chat error:', error);
        return 'Sorry, I encountered an error communicating with the AI model.';
    }
};
exports.chat = chat;
/**
 * Extract tool calls from LLM response using regex (fallback for models without native function calling)
 */
const extractToolCallsFromText = (text) => {
    const toolCalls = [];
    // Pattern: TOOL_CALL: tool_name.method_name(params)
    const pattern = /TOOL_CALL:\s*(\w+)\.(\w+)\(([^)]*)\)/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const [, toolName, methodName, paramsStr] = match;
        try {
            // Try to parse params as JSON
            const params = paramsStr.trim() ? JSON.parse(`{${paramsStr}}`) : {};
            toolCalls.push({
                tool: toolName,
                method: methodName,
                params
            });
        }
        catch (error) {
            console.warn(`Failed to parse tool call params: ${paramsStr}`);
        }
    }
    return toolCalls;
};
exports.extractToolCallsFromText = extractToolCallsFromText;
const isOllamaAvailable = async () => {
    try {
        const response = await fetch(`${OLLAMA_HOST}/api/tags`);
        return response.ok;
    }
    catch {
        return false;
    }
};
exports.isOllamaAvailable = isOllamaAvailable;
