"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableTools = exports.processMessage = void 0;
const ollama_client_1 = require("./ollama-client");
const tool_executor_1 = require("./tool-executor");
const database_1 = require("./database");
const MAX_TOOL_ROUNDS = 3; // Maximum number of tool execution rounds per message
const buildSystemPrompt = () => {
    const tools = tool_executor_1.toolExecutor.getTools();
    const toolDescriptions = tools
        .map((tool) => `- ${tool.name}: ${tool.description}`)
        .join('\n');
    return `You are DeepKit Brain, an AI assistant with access to the following tools:

${toolDescriptions}

When a user asks you to perform an action, you can use these tools to help them. To use a tool, respond with:
TOOL_CALL: tool_name.method_name("param1": "value1", "param2": "value2")

Examples:
- User: "Create a task to review the PR"
  You: TOOL_CALL: task_tracker.create_task("title": "Review PR", "priority": "high")

- User: "What's on my calendar today?"
  You: TOOL_CALL: calendar.list_events()

- User: "Generate a QR code for https://example.com"
  You: TOOL_CALL: qr_generator.generate("type": "url", "content": "https://example.com")

After using a tool, you'll receive the result and should provide a helpful response to the user explaining what was done.

Be conversational, helpful, and concise. Only use tools when the user explicitly requests an action.`;
};
/**
 * Process a user message with multi-turn tool execution
 */
const processMessage = async (userMessage, conversationHistory = [], conversationId) => {
    const systemPrompt = buildSystemPrompt();
    const executionLog = [];
    let currentMessage = userMessage;
    let finalResponse = '';
    let toolCallsMade = [];
    // Multi-turn tool execution loop
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        console.log(`\n🔄 Agent Round ${round + 1}/${MAX_TOOL_ROUNDS}`);
        // Get LLM response
        const ollamaResponse = await (0, ollama_client_1.chatWithTools)(currentMessage, {
            systemPrompt,
            tools: tool_executor_1.toolExecutor.getToolDefinitions()
        });
        const responseText = ollamaResponse.message?.content || ollamaResponse.response || '';
        // Check for native function calls (Ollama with function calling support)
        if (ollamaResponse.message?.tool_calls && ollamaResponse.message.tool_calls.length > 0) {
            console.log('✨ Detected native function calls');
            for (const toolCall of ollamaResponse.message.tool_calls) {
                const functionName = toolCall.function.name;
                const args = toolCall.function.arguments;
                // Parse function name (format: toolName_methodName)
                const parsed = tool_executor_1.toolExecutor.parseToolCall(functionName);
                if (!parsed) {
                    console.warn(`Could not parse function name: ${functionName}`);
                    continue;
                }
                const { toolName, methodName } = parsed;
                // Execute tool
                console.log(`🔧 Executing ${toolName}.${methodName}`, args);
                const result = await tool_executor_1.toolExecutor.executeTool(toolName, methodName, args);
                executionLog.push({
                    tool: toolName,
                    method: methodName,
                    params: args,
                    result: result.data,
                    success: result.success,
                    executionTime: result.executionTime
                });
                toolCallsMade.push({ tool: toolName, method: methodName, params: args });
                // Log to database if conversation ID provided
                if (conversationId) {
                    (0, database_1.logToolCall)(conversationId, toolName, methodName, args, result.data, result.success);
                }
                // Prepare next message with tool result
                currentMessage = `Tool ${toolName}.${methodName} was executed. Result: ${JSON.stringify(result.data)}. Please provide a response to the user explaining what was done.`;
            }
            // Continue loop to get final response
            continue;
        }
        // Fallback: Check for text-based tool calls (for models without native function calling)
        const textToolCalls = (0, ollama_client_1.extractToolCallsFromText)(responseText);
        if (textToolCalls.length > 0) {
            console.log(`🔧 Detected ${textToolCalls.length} text-based tool calls`);
            for (const toolCall of textToolCalls) {
                const { tool, method, params } = toolCall;
                console.log(`🔧 Executing ${tool}.${method}`, params);
                const result = await tool_executor_1.toolExecutor.executeTool(tool, method, params);
                executionLog.push({
                    tool,
                    method,
                    params,
                    result: result.data,
                    success: result.success,
                    executionTime: result.executionTime
                });
                toolCallsMade.push({ tool, method, params });
                // Log to database
                if (conversationId) {
                    (0, database_1.logToolCall)(conversationId, tool, method, params, result.data, result.success);
                }
                // Prepare next message with tool result
                currentMessage = `Tool ${tool}.${method} was executed. Result: ${JSON.stringify(result.data)}. Please provide a response to the user explaining what was done.`;
            }
            // Continue loop to get final response
            continue;
        }
        // No tool calls detected - this is the final response
        finalResponse = responseText;
        console.log('✅ Final response received');
        break;
    }
    // If we hit max rounds without a final response, use the last response
    if (!finalResponse) {
        console.warn('⚠️ Hit max tool execution rounds without final response');
        finalResponse = 'I executed the requested tools but encountered an issue generating a final response.';
    }
    return {
        response: finalResponse,
        toolCalls: toolCallsMade,
        executionLog
    };
};
exports.processMessage = processMessage;
const getAvailableTools = () => {
    return tool_executor_1.toolExecutor.getTools();
};
exports.getAvailableTools = getAvailableTools;
