const winston = require('winston');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * AgentCore - Intelligent message processing with Ollama + Tool Calling
 *
 * Features:
 * - LLM-powered message understanding via Ollama /api/chat
 * - Native tool calling with llama3.2 (tools parameter)
 * - Fallback to prompt-based tool extraction if native fails
 * - Execute-loop: LLM decides tool -> execute -> feed result -> LLM responds
 * - Max 3 tool rounds per message (prevent infinite loops)
 * - Health checks, task management, n8n workflow triggers
 */
class AgentCore {
  constructor(config) {
    this.storage = config.storage;
    this.messageBroker = config.messageBroker;
    this.ollamaURL = config.ollamaURL || 'http://deepkit-engine:11434';
    this.model = config.model || 'llama3.2:latest';
    this.ollamaConnected = false;
    this.nativeToolCalling = true; // Start optimistic, degrade if needed
    this.maxToolRounds = 3;

    // Tool registry: name -> { definition, execute }
    this.tools = new Map();

    // Track last tool executed (for metadata in responses)
    this.lastToolExecuted = null;
  }

  /**
   * Initialize: verify Ollama connection and load tools
   */
  async initialize() {
    // Load tools
    this.loadTools();

    // Test Ollama connection
    try {
      const response = await axios.get(`${this.ollamaURL}/api/tags`, { timeout: 10000 });
      this.ollamaConnected = true;
      const models = response.data.models?.map(m => m.name) || [];
      logger.info('AgentCore initialized', {
        ollama: this.ollamaURL,
        model: this.model,
        available_models: models,
        tools_loaded: Array.from(this.tools.keys())
      });

      // Verify our model is available
      if (models.length > 0 && !models.some(m => m.includes('llama3.2'))) {
        logger.warn('llama3.2 not found in available models. Tool calling may not work natively.');
      }

      // llama3.2 does NOT support Ollama's native tools parameter.
      // Default to prompt-based tool calling to avoid first-message failure.
      // Prompt-based works reliably: injects tool descriptions into system prompt,
      // LLM responds with JSON tool call blocks, we parse and execute.
      if (this.model.includes('llama3.2') || this.model.includes('llama3.1')) {
        this.nativeToolCalling = false;
        logger.info('Model detected as llama3.x - using prompt-based tool calling (more reliable)');
      } else {
        // For other models, test native support at startup
        try {
          await axios.post(`${this.ollamaURL}/api/chat`, {
            model: this.model,
            messages: [{ role: 'user', content: 'test' }],
            tools: [{ type: 'function', function: { name: 'test', description: 'test', parameters: { type: 'object', properties: {} } } }],
            stream: false
          }, { timeout: 15000 });
          this.nativeToolCalling = true;
          logger.info('Native tool calling supported by model');
        } catch (e) {
          this.nativeToolCalling = false;
          logger.info('Native tool calling not supported, using prompt-based');
        }
      }

      return true;
    } catch (error) {
      logger.warn('Ollama not available, running in degraded mode', { error: error.message });
      this.ollamaConnected = false;
      return false;
    }
  }

  /**
   * Load tool definitions from src/tools/deepkit/
   */
  loadTools() {
    const toolsDir = path.join(__dirname, '..', 'tools', 'deepkit');

    if (!fs.existsSync(toolsDir)) {
      logger.warn('Tools directory not found:', toolsDir);
      return;
    }

    const files = fs.readdirSync(toolsDir).filter(f => f.endsWith('.js'));

    for (const file of files) {
      try {
        const tool = require(path.join(toolsDir, file));
        if (tool.definition && tool.execute) {
          const name = tool.definition.function.name;
          this.tools.set(name, tool);
          logger.info(`Tool loaded: ${name}`);
        } else {
          logger.warn(`Skipping ${file}: missing definition or execute function`);
        }
      } catch (error) {
        logger.error(`Failed to load tool ${file}: ${error.message}`);
      }
    }

    logger.info(`Loaded ${this.tools.size} tools: ${Array.from(this.tools.keys()).join(', ')}`);
  }

  /**
   * Get Ollama-compatible tool definitions array
   */
  getToolDefinitions() {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /**
   * Process incoming message with full tool calling loop
   */
  async processMessage(message) {
    const content = message.content.trim();
    const userId = message.sender;
    const channel = message.channel;

    try {
      // If Ollama is offline, use basic pattern matching fallback
      if (!this.ollamaConnected) {
        return await this.processWithoutLLM(content, userId, channel);
      }

      // Full LLM + tool calling pipeline
      return await this.processWithToolCalling(content, userId, channel);

    } catch (error) {
      logger.error('Message processing error:', error);
      const errorMsg = `Error processing request. THE PROXY encountered: ${error.message}`;
      return {
        message: errorMsg,
        structured: { type: 'error', data: { message: errorMsg, error: error.message }, tool: null, success: false }
      };
    }
  }

  /**
   * Detect tool intent from user message via pattern matching.
   * Returns { tool, args } if a tool should be called, or null for general chat.
   * This is the PRIMARY dispatcher — faster and more reliable than LLM tool selection on 3.2B models.
   */
  detectToolIntent(message) {
    const msg = message.toLowerCase().trim();

    // --- Task Tracker ---
    // Create task
    const createMatch = message.match(/(?:create|add|make|new)\s+(?:a\s+)?(?:task|todo|item)\s+(?:called|named|titled)\s+(.+)/i) ||
                        message.match(/(?:create|add|make|new)\s+(?:a\s+)?(?:task|todo|item)[:\s]+(.+)/i) ||
                        message.match(/(?:task|todo)[:\s]+(.+)/i);
    if (createMatch) {
      return { tool: 'task_tracker', args: { action: 'create', title: createMatch[1].trim() } };
    }

    // List tasks
    if (msg.match(/(?:list|show|get|view|my)\s*(?:all\s+)?(?:tasks?|todos?)/i) ||
        msg === 'tasks' || msg === 'todos') {
      return { tool: 'task_tracker', args: { action: 'list' } };
    }

    // --- Notes ---
    const saveNoteMatch = message.match(/(?:save|write|note|jot|remember)[:\s]+(.+)/i);
    if (saveNoteMatch && !msg.includes('task')) {
      return { tool: 'notes', args: { action: 'save', title: saveNoteMatch[1].substring(0, 50), content: saveNoteMatch[1] } };
    }
    if (msg.match(/(?:list|show|get|view|my)\s*(?:all\s+)?notes?/i)) {
      return { tool: 'notes', args: { action: 'list' } };
    }
    const searchNoteMatch = message.match(/(?:search|find)\s+notes?\s+(?:for|about|on)\s+(.+)/i);
    if (searchNoteMatch) {
      return { tool: 'notes', args: { action: 'search', query: searchNoteMatch[1] } };
    }

    // --- Calendar ---
    if (msg.match(/(?:today'?s?|my)\s*(?:schedule|calendar|events?|agenda)/i) || msg === 'today') {
      return { tool: 'calendar', args: { action: 'today' } };
    }
    if (msg.match(/(?:this\s+)?week'?s?\s*(?:schedule|calendar|events?|agenda)/i)) {
      return { tool: 'calendar', args: { action: 'week' } };
    }
    const createEventMatch = message.match(/(?:schedule|create|add|book)\s+(?:an?\s+)?(?:event|meeting|appointment)[:\s]+(.+)/i);
    if (createEventMatch) {
      return { tool: 'calendar', args: { action: 'create', title: createEventMatch[1].trim() } };
    }

    // --- System Info ---
    if (msg.match(/(?:system|server|cpu|memory|ram|disk|uptime)\s*(?:info|status|stats|usage)?/i) ||
        msg.match(/(?:how'?s?\s+(?:the\s+)?(?:system|server))/i)) {
      return { tool: 'system_info', args: {} };
    }

    // --- Health Check ---
    if (msg.match(/(?:health|status)\s*(?:check)?/i) || msg.match(/(?:is\s+\w+\s+running|what'?s?\s+running)/i)) {
      return { tool: 'health_check', args: { service: 'all' } };
    }

    // --- File Operations ---
    const readFileMatch = message.match(/(?:read|show|cat|open|view)\s+(?:the\s+)?file\s+(.+)/i);
    if (readFileMatch) {
      return { tool: 'file_ops', args: { action: 'read', path: readFileMatch[1].trim() } };
    }
    const writeFileMatch = message.match(/(?:write|save|create)\s+(?:to\s+)?file\s+([^\s]+)\s+(.+)/i);
    if (writeFileMatch) {
      return { tool: 'file_ops', args: { action: 'write', path: writeFileMatch[1].trim(), content: writeFileMatch[2].trim() } };
    }
    const listDirMatch = message.match(/(?:list|ls|dir|show)\s+(?:files\s+in\s+)?(?:directory\s+)?(.+)/i);
    if (listDirMatch && msg.includes('file')) {
      return { tool: 'file_ops', args: { action: 'list', path: listDirMatch[1].trim() } };
    }

    // --- Web Fetch ---
    const fetchMatch = message.match(/(?:fetch|get|download|grab)\s+(?:from\s+)?(?:url\s+)?(https?:\/\/[^\s]+)/i);
    if (fetchMatch) {
      return { tool: 'web_fetch', args: { url: fetchMatch[1].trim() } };
    }

    // --- Process Control ---
    if (msg.match(/(?:docker|container)\s+(?:ps|list|status)/i)) {
      return { tool: 'process_control', args: { action: 'docker_ps' } };
    }
    if (msg.match(/(?:docker)\s+(?:logs)\s+(.+)/i)) {
      const containerMatch = message.match(/(?:docker)\s+(?:logs)\s+(.+)/i);
      return { tool: 'process_control', args: { action: 'docker_logs', container: containerMatch[1].trim() } };
    }
    if (msg.match(/(?:list|show|ps)\s+(?:running\s+)?(?:processes?)/i)) {
      return { tool: 'process_control', args: { action: 'list' } };
    }

    // --- n8n Workflow Builder ---
    // Create a workflow from natural language
    const buildWorkflowMatch = message.match(/(?:create|build|make|set\s*up)\s+(?:an?\s+)?(?:workflow|automation|process)\s+(?:that|to|for|which)\s+(.+)/i);
    if (buildWorkflowMatch) {
      return { tool: 'n8n_builder', args: { intent: buildWorkflowMatch[0] } };
    }

    // Deploy a template
    const deployTemplateMatch = message.match(/deploy\s+(?:the\s+)?(.+?)\s+template/i);
    if (deployTemplateMatch) {
      return { tool: 'n8n_builder', args: { intent: deployTemplateMatch[0], template: deployTemplateMatch[1].toLowerCase().replace(/\s+/g, '_') } };
    }

    // --- n8n Workflow Management ---
    // List workflows
    if (msg.match(/(?:list|show|get|view|my)\s*(?:all\s+)?(?:workflows?|automations?)/i) ||
        msg === 'workflows' || msg === 'automations') {
      return { tool: 'n8n_create', args: { action: 'list' } };
    }

    // Get workflow details
    const getWorkflowMatch = message.match(/(?:get|show|view|details?\s+(?:of|for))\s+workflow\s+(\S+)/i);
    if (getWorkflowMatch) {
      return { tool: 'n8n_create', args: { action: 'get', workflow_id: getWorkflowMatch[1] } };
    }

    // Activate/deactivate workflow
    const activateMatch = message.match(/(?:activate|enable|start)\s+workflow\s+(\S+)/i);
    if (activateMatch) {
      return { tool: 'n8n_create', args: { action: 'activate', workflow_id: activateMatch[1] } };
    }
    const deactivateMatch = message.match(/(?:deactivate|disable|stop|pause)\s+workflow\s+(\S+)/i);
    if (deactivateMatch) {
      return { tool: 'n8n_create', args: { action: 'deactivate', workflow_id: deactivateMatch[1] } };
    }

    // Delete workflow
    const deleteWorkflowMatch = message.match(/(?:delete|remove|destroy)\s+workflow\s+(\S+)/i);
    if (deleteWorkflowMatch) {
      return { tool: 'n8n_create', args: { action: 'delete', workflow_id: deleteWorkflowMatch[1] } };
    }

    // --- n8n Trigger (existing webhooks) ---
    const triggerMatch = message.match(/(?:trigger|run|execute|fire)\s+(?:workflow|automation|n8n)?\s*(?:webhook\s+)?(\S+)/i);
    if (triggerMatch && msg.match(/(?:trigger|run|execute|fire)/)) {
      return { tool: 'n8n_trigger', args: { workflow_id: triggerMatch[1] } };
    }

    // --- Docker Discovery / Services ---
    if (msg.match(/(?:show|list|get|view)\s*(?:all\s+)?(?:services?|containers?)/i) ||
        msg.match(/(?:what'?s?\s+)?running/i) ||
        msg === 'services') {
      return { tool: 'docker_discovery', args: { action: 'health' } };
    }
    const logsMatch = message.match(/(?:logs?|output)\s+(?:for|from|of)\s+(\S+)/i);
    if (logsMatch) {
      return { tool: 'docker_discovery', args: { action: 'logs', service: logsMatch[1].trim() } };
    }

    // --- Content Extraction ---
    // Extract/summarize/read content from URLs
    const urlMatch = message.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch && msg.match(/(?:extract|summarize|read|what\s+is|tell\s+me\s+about|analyze)/i)) {
      return { tool: 'content_extract', args: { url: urlMatch[1], context: message } };
    }
    // Direct URL with context words
    if (urlMatch && (msg.includes('youtube') || msg.includes('github') || msg.match(/this\s+(?:link|url|page)/i))) {
      return { tool: 'content_extract', args: { url: urlMatch[1] } };
    }

    // --- Document Generation ---
    const docMatch = message.match(/(?:create|generate|write|draft)\s+(?:a\s+)?(?:document|doc|report|memo)\s+(?:about|on|for|titled)\s+(.+)/i);
    if (docMatch) {
      return { tool: 'doc_generate', args: { title: docMatch[1].trim(), content: message } };
    }

    // --- No tool match: general chat ---
    return null;
  }

  /**
   * Main LLM processing with tool calling loop
   */
  async processWithToolCalling(userMessage, userId, channel) {
    const startTime = Date.now();

    // STEP 1: Try pattern matching first (fast, reliable)
    const toolIntent = this.detectToolIntent(userMessage);

    if (toolIntent && this.tools.has(toolIntent.tool)) {
      logger.info('Tool intent detected via pattern matching', { tool: toolIntent.tool, args: toolIntent.args });

      const result = await this.executeTool(toolIntent.tool, toolIntent.args, {
        storage: this.storage, userId, channel: channel || 'api'
      });

      const duration = Date.now() - startTime;
      logger.info('Direct tool execution complete', { tool: toolIntent.tool, duration: `${duration}ms`, success: result.success !== false });

      // Log transaction
      if (this.storage) {
        try {
          await this.storage.logTransaction({
            type: 'tool_execution', action: `Direct: ${toolIntent.tool}`,
            userId, channel: channel || 'api',
            details: { tool: toolIntent.tool, args: toolIntent.args, duration },
            status: result.success !== false ? 'completed' : 'failed'
          });
        } catch (e) { /* ignore */ }
      }

      // Format text response (backward-compatible for WhatsApp/text channels)
      let textResponse = result.message || (result.success !== false ? 'Done.' : `Error: ${result.error}`);

      // If we have task/note/event listings, format them nicely for text
      if (result.tasks && result.tasks.length > 0) {
        const taskList = result.tasks.map(t => `- [${t.id}] ${t.title} (${t.priority}, ${t.status})`).join('\n');
        textResponse = `${result.count} task(s) in the Arsenal:\n${taskList}`;
      }
      if (result.notes && result.notes.length > 0) {
        const noteList = result.notes.map(n => `- [${n.id}] ${n.title}: ${n.preview}`).join('\n');
        textResponse = `${result.count} note(s):\n${noteList}`;
      }
      if (result.events && result.events.length > 0) {
        const eventList = result.events.map(e => `- ${e.title} (${e.start})`).join('\n');
        textResponse = `${result.count} event(s):\n${eventList}`;
      }

      await this.saveConversation(userId, channel || 'api', [], userMessage, textResponse);

      // Return structured response for generative UI
      return {
        message: textResponse,
        structured: {
          type: result.type || this.inferResponseType(toolIntent.tool, result),
          data: result.data || result,
          tool: toolIntent.tool,
          success: result.success !== false,
          duration: `${duration}ms`,
          suggestions: this.getSuggestions(toolIntent.tool, result)
        }
      };
    }

    // STEP 2: No clear tool intent — use LLM for general chat
    logger.info('No tool intent detected, using LLM for chat');

    // Get conversation history
    let conversationHistory = [];
    if (this.storage) {
      try {
        const conversation = await this.storage.getConversation(userId, channel || 'api');
        conversationHistory = conversation.messages || [];
      } catch (error) {
        logger.warn('Could not retrieve conversation history:', error.message);
      }
    }

    // Build messages array
    const messages = [
      { role: 'system', content: this.buildSystemPrompt() }
    ];

    // Add last 10 messages from history (5 exchanges)
    const recentHistory = conversationHistory.slice(-10);
    messages.push(...recentHistory);

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    // Tool calling loop
    let toolsUsed = [];
    let round = 0;
    let lastSuccessfulResult = null;

    try {
      // First call - with tools
      let response = await this.callOllamaWithTools(messages);

      // Loop while the LLM wants to call tools (max rounds)
      while (round < this.maxToolRounds) {
        const toolCalls = this.extractToolCalls(response);

        if (!toolCalls || toolCalls.length === 0) {
          // No tool calls - LLM is done, break with final response
          break;
        }

        round++;
        logger.info(`Tool calling round ${round}/${this.maxToolRounds}`, {
          tools: toolCalls.map(tc => tc.name)
        });

        // Add the assistant message (with tool calls) to conversation
        if (response.message) {
          messages.push(response.message);
        }

        // Execute each tool call
        for (const toolCall of toolCalls) {
          toolsUsed.push(toolCall.name);

          const toolResult = await this.executeTool(toolCall.name, toolCall.arguments, {
            storage: this.storage,
            userId,
            channel: channel || 'api'
          });

          logger.info(`Tool ${toolCall.name} result:`, {
            success: toolResult.success !== false,
            preview: JSON.stringify(toolResult).substring(0, 200)
          });

          // Track last successful result for fallback response
          if (toolResult.success !== false && toolResult.message) {
            lastSuccessfulResult = toolResult.message;
          }

          // Add tool result to messages
          messages.push({
            role: 'tool',
            content: JSON.stringify(toolResult)
          });
        }

        // Call LLM again with tool results
        response = await this.callOllamaWithTools(messages);
      }

      // Extract final text response
      let finalResponse = this.extractTextResponse(response);

      // If LLM response is generic/empty but we have a tool result, use that
      if (lastSuccessfulResult && (finalResponse === 'Operation completed.' || finalResponse === 'Processing complete.')) {
        finalResponse = lastSuccessfulResult;
      }
      const duration = Date.now() - startTime;

      logger.info('Processing complete', {
        duration: `${duration}ms`,
        rounds: round,
        toolsUsed
      });

      // Save conversation history
      await this.saveConversation(userId, channel || 'api', conversationHistory, userMessage, finalResponse);

      // Log tool usage transaction
      if (toolsUsed.length > 0 && this.storage) {
        try {
          await this.storage.logTransaction({
            type: 'tool_execution',
            action: `Tools used: ${toolsUsed.join(', ')}`,
            userId,
            channel: channel || 'api',
            details: { toolsUsed, rounds: round, duration },
            status: 'completed'
          });
        } catch (e) {
          logger.warn('Could not log transaction:', e.message);
        }
      }

      // Return structured response for generative UI
      const lastTool = toolsUsed[toolsUsed.length - 1] || null;
      return {
        message: finalResponse,
        structured: {
          type: toolsUsed.length > 0 ? 'tool_result' : 'chat',
          data: { text: finalResponse, toolsUsed, rounds: round },
          tool: lastTool,
          success: true,
          duration: `${duration}ms`,
          suggestions: this.getSuggestions(lastTool, null)
        }
      };

    } catch (error) {
      logger.error('Tool calling loop error:', error);

      // Fallback: try simple chat without tools
      try {
        logger.info('Falling back to simple chat (no tools)');
        const fallbackResponse = await this.callOllamaSimple(messages);
        const text = this.extractTextResponse(fallbackResponse);
        await this.saveConversation(userId, channel || 'api', conversationHistory, userMessage, text);
        return {
          message: text,
          structured: { type: 'chat', data: { text }, tool: null, success: true }
        };
      } catch (fallbackError) {
        const errorMsg = `THE BRAIN encountered an error. ${error.message}`;
        return {
          message: errorMsg,
          structured: { type: 'error', data: { message: errorMsg, error: error.message }, tool: null, success: false }
        };
      }
    }
  }

  /**
   * Call Ollama /api/chat with tools parameter (native tool calling)
   */
  async callOllamaWithTools(messages) {
    if (!this.nativeToolCalling) {
      return await this.callOllamaPromptBased(messages);
    }

    try {
      const toolDefs = this.getToolDefinitions();

      const requestBody = {
        model: this.model,
        messages,
        stream: false
      };

      // Only include tools if we have them
      if (toolDefs.length > 0) {
        requestBody.tools = toolDefs;
      }

      const response = await axios.post(
        `${this.ollamaURL}/api/chat`,
        requestBody,
        { timeout: 180000 }
      );

      return response.data;

    } catch (error) {
      // If tool calling fails with specific errors, fall back to prompt-based
      if (error.response?.status === 400 ||
          error.message?.includes('tool') ||
          error.message?.includes('function') ||
          error.message?.includes('timeout')) {
        logger.warn('Native tool calling failed, switching to prompt-based extraction');
        this.nativeToolCalling = false;
        return await this.callOllamaPromptBased(messages);
      }
      throw error;
    }
  }

  /**
   * Call Ollama without tools (simple chat)
   */
  async callOllamaSimple(messages) {
    const response = await axios.post(
      `${this.ollamaURL}/api/chat`,
      {
        model: this.model,
        messages,
        stream: false
      },
      { timeout: 180000 }
    );
    return response.data;
  }

  /**
   * Fallback: Call Ollama with prompt-based tool extraction
   * Injects tool descriptions into system prompt and parses JSON tool calls from response
   */
  async callOllamaPromptBased(messages) {
    // Build compact tool descriptions (minimal tokens for small models)
    const toolDescriptions = Array.from(this.tools.values()).map(t => {
      const fn = t.definition.function;
      const params = Object.keys(fn.parameters.properties || {}).join(', ');
      return `${fn.name}(${params}): ${fn.description.split('.')[0]}`;
    }).join('\n');

    const toolInstructions = `

TOOLS YOU MUST USE:
${toolDescriptions}

RULES:
1. You MUST call a tool when the user asks to create, list, update, check, or search anything.
2. NEVER make up data. NEVER invent task IDs, events, or results.
3. To call a tool, output ONLY this exact format:

\`\`\`tool
{"name": "task_tracker", "arguments": {"action": "create", "title": "example"}}
\`\`\`

EXAMPLES:
- User: "Create a task called Review docs" → \`\`\`tool
{"name": "task_tracker", "arguments": {"action": "create", "title": "Review docs"}}
\`\`\`
- User: "List my tasks" → \`\`\`tool
{"name": "task_tracker", "arguments": {"action": "list"}}
\`\`\`
- User: "Save a note about the meeting" → \`\`\`tool
{"name": "notes", "arguments": {"action": "save", "title": "Meeting", "content": "Notes about the meeting"}}
\`\`\`
- User: "What's the system status" → \`\`\`tool
{"name": "system_info", "arguments": {}}
\`\`\`

If the user just wants to chat (greeting, question about you), respond normally without a tool.
Otherwise, ALWAYS use a tool. Output ONLY the tool JSON block, nothing else.`;

    const augmentedMessages = messages.map((msg, i) => {
      if (i === 0 && msg.role === 'system') {
        return {
          ...msg,
          content: msg.content + toolInstructions
        };
      }
      return msg;
    });

    const response = await axios.post(
      `${this.ollamaURL}/api/chat`,
      {
        model: this.model,
        messages: augmentedMessages,
        stream: false
      },
      { timeout: 180000 }
    );

    // Parse the response and check for tool call patterns
    const data = response.data;
    const content = data.message?.content || '';

    // Extract tool call from response - try multiple strategies
    let parsed = null;

    // Strategy 1: Code-fenced JSON (```tool ... ``` or ``` ... ```)
    const fenceMatch = content.match(/```(?:tool)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) {
      try { parsed = JSON.parse(fenceMatch[1].trim()); } catch (e) { /* continue */ }
    }

    // Strategy 2: Find JSON containing "name" or "tool" key by bracket matching
    if (!parsed) {
      const jsonStart = content.indexOf('{');
      if (jsonStart !== -1) {
        // Find matching closing brace
        let depth = 0;
        let jsonEnd = -1;
        for (let i = jsonStart; i < content.length; i++) {
          if (content[i] === '{') depth++;
          else if (content[i] === '}') { depth--; if (depth === 0) { jsonEnd = i; break; } }
        }
        if (jsonEnd !== -1) {
          try { parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1)); } catch (e) { /* continue */ }
        }
      }
    }

    if (parsed) {
      // Normalize: accept "name", "tool", or "function" as the tool name key
      const toolName = parsed.name || parsed.tool || parsed.function;

      if (toolName && this.tools.has(toolName)) {
        data.message.tool_calls = [{
          function: {
            name: toolName,
            arguments: parsed.arguments || parsed.params || {}
          }
        }];
        data.message.content = '';
        logger.info('Extracted tool call from prompt-based response', { tool: toolName, args: parsed.arguments || parsed.params });
      }
    }

    return data;
  }

  /**
   * Extract tool calls from an Ollama response
   * Handles both native tool calling format and prompt-based extraction
   */
  extractToolCalls(response) {
    if (!response || !response.message) return null;

    const msg = response.message;

    // Native Ollama tool calling format
    if (msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      return msg.tool_calls.map(tc => {
        const fn = tc.function;
        let args = fn.arguments;

        // Arguments might be a string or already an object
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch (e) {
            logger.warn('Could not parse tool arguments:', args);
            args = {};
          }
        }

        return {
          name: fn.name,
          arguments: args || {}
        };
      }).filter(tc => this.tools.has(tc.name));
    }

    return null;
  }

  /**
   * Extract final text response from Ollama response
   */
  extractTextResponse(response) {
    if (!response || !response.message) {
      return 'Processing complete.';
    }

    const content = response.message.content;
    if (!content || content.trim() === '') {
      return 'Operation completed.';
    }

    return content.trim();
  }

  /**
   * Infer the UI response type from tool name and result
   */
  inferResponseType(toolName, result) {
    // Map tools to UI template types
    const toolTypeMap = {
      'task_tracker': 'task_list',
      'notes': 'note',
      'system_info': 'system_status',
      'health_check': 'system_status',
      'calendar': 'calendar',
      'n8n_create': 'workflow',
      'n8n_builder': 'workflow',
      'n8n_trigger': 'workflow',
      'file_ops': 'file',
      'web_fetch': 'web',
      'process_control': 'system_status',
      'docker_discovery': 'service_grid',
      'content_extract': 'note',
      'doc_generate': 'note'
    };

    return result.type || toolTypeMap[toolName] || 'chat';
  }

  /**
   * Execute a registered tool
   */
  async executeTool(toolName, args, context) {
    const tool = this.tools.get(toolName);

    if (!tool) {
      logger.error(`Unknown tool: ${toolName}`);
      return { success: false, error: `Unknown tool: ${toolName}` };
    }

    try {
      // Track tool execution for metadata
      this.lastToolExecuted = {
        name: toolName,
        args: args,
        timestamp: new Date().toISOString()
      };

      const result = await tool.execute(args, context);
      return result;
    } catch (error) {
      logger.error(`Tool ${toolName} execution failed:`, error);
      return {
        success: false,
        error: `Tool ${toolName} failed: ${error.message}`
      };
    }
  }

  /**
   * Build the system prompt (The Silent Admin personality)
   */
  buildSystemPrompt() {
    const toolNames = Array.from(this.tools.keys()).join(', ');

    return `You are "The Silent Admin" - the AI assistant for DeepKit, a sovereign local AI toolkit.

Personality:
- Helpful but BRIEF (1-3 sentences max)
- Use DeepKit terminology: Arsenal, The Vault (Postgres), The Brain (Ollama), The Engine (n8n), The Proxy (Messenger)
- Confirm actions with key details, then stop
- No verbose explanations unless asked

You have access to these tools: ${toolNames}

Tool Usage Guidelines:
- Use task_tracker to create, list, or update tasks when the user asks about tasks, todos, or action items
- Use health_check when asked about system status, service health, or "is X running"
- Use n8n_trigger when asked to run an automation or trigger a workflow
- ALWAYS use a tool when the user's request matches a tool's purpose
- After tool execution, summarize the result briefly

Current context: User messaging via DeepKit Messenger (THE PROXY, port 3333).`;
  }

  /**
   * Save conversation history to storage
   */
  async saveConversation(userId, channel, existingHistory, userMessage, aiResponse) {
    if (!this.storage) return;

    try {
      const updatedMessages = [
        ...existingHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse }
      ].slice(-20); // Keep last 20 messages

      const conversation = await this.storage.getConversation(userId, channel);
      await this.storage.updateConversation(conversation.id, updatedMessages);
    } catch (error) {
      logger.warn('Could not save conversation:', error.message);
    }
  }

  /**
   * Fallback: process message without LLM (pattern matching)
   */
  async processWithoutLLM(content, userId, channel) {
    const contentLower = content.toLowerCase();

    // Use the full pattern matcher even without LLM
    const toolIntent = this.detectToolIntent(content);

    if (toolIntent && this.tools.has(toolIntent.tool)) {
      const startTime = Date.now();
      const result = await this.executeTool(toolIntent.tool, toolIntent.args, {
        storage: this.storage, userId, channel: channel || 'api'
      });
      const duration = Date.now() - startTime;

      let textResponse = result.message || 'Done.';
      if (result.tasks && result.tasks.length > 0) {
        const taskList = result.tasks.map(t => `- [${t.id}] ${t.title} (${t.priority}, ${t.status})`).join('\n');
        textResponse = `${result.count} task(s) in the Arsenal:\n${taskList}`;
      }
      if (result.notes && result.notes.length > 0) {
        const noteList = result.notes.map(n => `- [${n.id}] ${n.title}: ${n.preview}`).join('\n');
        textResponse = `${result.count} note(s):\n${noteList}`;
      }

      return {
        message: textResponse,
        structured: {
          type: result.type || this.inferResponseType(toolIntent.tool, result),
          data: result.data || result,
          tool: toolIntent.tool,
          success: result.success !== false,
          duration: `${duration}ms`
        }
      };
    }

    const offlineMsg = `THE BRAIN (Ollama) is offline. Running in basic mode. Received: "${content.substring(0, 80)}"`;
    return {
      message: offlineMsg,
      structured: { type: 'error', data: { message: offlineMsg, error: 'LLM offline' }, tool: null, success: false }
    };
  }
  // ============================================
  // FEATURE: Follow-up suggestions
  // ============================================

  getSuggestions(tool, result) {
    const defaults = ['System status', 'List my tasks', 'Show workflows'];
    if (!tool) return defaults;

    const map = {
      system_info: ['List my tasks', 'Show workflows', 'Show services'],
      health_check: ['System status', 'List my tasks', 'Show services'],
      task_tracker: ['List my tasks', 'Create a task', 'Show workflows'],
      notes: ['List my notes', 'Save a note', 'List my tasks'],
      n8n_create: ['Show workflows', 'Create a workflow', 'System status'],
      n8n_builder: ['Show workflows', 'Trigger workflow', 'System status'],
      n8n_trigger: ['Show workflows', 'System status', 'List my tasks'],
      calendar: ['List my tasks', 'System status', 'Show workflows'],
      web_fetch: ['System status', 'List my tasks', 'Save a note'],
      file_ops: ['System status', 'List my tasks', 'Show workflows'],
      process_control: ['System status', 'Show services', 'List my tasks'],
      docker_discovery: ['Show services', 'System status', 'List my tasks'],
      content_extract: ['Summarize this', 'Save as a note', 'System status'],
      doc_generate: ['List my documents', 'Create another document', 'List my notes'],
    };

    // Refine based on action
    if (tool === 'task_tracker') {
      if (result?.action === 'created') return ['List my tasks', 'Create another task', 'System status'];
      if (result?.action === 'list') return ['Create a task', 'Show workflows', 'System status'];
    }
    if (tool === 'notes') {
      if (result?.action === 'saved') return ['List my notes', 'Create a task', 'System status'];
      if (result?.action === 'list') return ['Save a note', 'List my tasks', 'System status'];
    }

    return map[tool] || defaults;
  }

  // ============================================
  // FEATURE: Multi-tool intent detection
  // ============================================

  detectMultiIntent(userMessage) {
    const msg = userMessage.toLowerCase();
    const intents = [];

    // "Give me a summary" / "What's happening" / "Dashboard" / "Brief me"
    const summaryPatterns = [
      /(?:give\s+me\s+a\s+)?(?:summary|overview|brief|dashboard|status\s+report)/i,
      /(?:what'?s?\s+)?(?:happening|going\s+on)/i,
      /(?:brief|update)\s+me/i,
    ];

    if (summaryPatterns.some(p => p.test(msg))) {
      intents.push(
        { tool: 'system_info', args: {} },
        { tool: 'task_tracker', args: { action: 'list', limit: 5 } },
        { tool: 'n8n_create', args: { action: 'list' } },
        { tool: 'docker_discovery', args: { action: 'health' } }
      );
      return intents;
    }

    // "tasks and workflows" / "tasks and status"
    if (/tasks?\s+and\s+(?:workflow|automation)/i.test(msg)) {
      intents.push(
        { tool: 'task_tracker', args: { action: 'list' } },
        { tool: 'n8n_create', args: { action: 'list' } }
      );
      return intents;
    }

    return intents; // empty = not multi-intent
  }

  // ============================================
  // FEATURE: Streaming response processing
  // ============================================

  async processMessageStream(message, onEvent) {
    const { content: userMessage, sender: userId, channel } = message;
    const startTime = Date.now();

    // STEP 1: Pattern matching (fast path)
    const toolIntent = this.detectToolIntent(userMessage);

    if (toolIntent && this.tools.has(toolIntent.tool)) {
      const result = await this.executeTool(toolIntent.tool, toolIntent.args, {
        storage: this.storage, userId, channel: channel || 'api'
      });

      const duration = Date.now() - startTime;
      const suggestions = this.getSuggestions(toolIntent.tool, result);

      // Format text response
      let textResponse = result.message || 'Done.';
      if (result.tasks && result.tasks.length > 0) {
        const taskList = result.tasks.map(t => `- [${t.id}] ${t.title} (${t.priority}, ${t.status})`).join('\n');
        textResponse = `${result.count} task(s) in the Arsenal:\n${taskList}`;
      }
      if (result.notes && result.notes.length > 0) {
        const noteList = result.notes.map(n => `- [${n.id}] ${n.title}: ${n.preview}`).join('\n');
        textResponse = `${result.count} note(s):\n${noteList}`;
      }

      // Log and save
      if (this.storage) {
        try {
          await this.storage.logTransaction({
            type: 'tool_execution', action: `Direct: ${toolIntent.tool}`,
            userId, channel: channel || 'api',
            details: { tool: toolIntent.tool, args: toolIntent.args, duration },
            status: result.success !== false ? 'completed' : 'failed'
          });
        } catch (e) { /* ignore */ }
      }
      await this.saveConversation(userId, channel || 'api', [], userMessage, textResponse);

      onEvent({
        type: 'tool_result',
        data: {
          response: textResponse,
          structured: {
            type: result.type || this.inferResponseType(toolIntent.tool, result),
            data: result.data || result,
            tool: toolIntent.tool,
            success: result.success !== false,
            duration: `${duration}ms`,
            suggestions
          }
        }
      });
      onEvent({ type: 'done', data: {} });
      return;
    }

    // STEP 2: Multi-tool composition
    const multiTools = this.detectMultiIntent(userMessage);
    if (multiTools.length > 1) {
      const validTools = multiTools.filter(t => this.tools.has(t.tool));
      if (validTools.length > 1) {
        onEvent({ type: 'multi_start', data: { count: validTools.length } });

        const results = await Promise.all(
          validTools.map(async (t) => {
            const result = await this.executeTool(t.tool, t.args, {
              storage: this.storage, userId, channel: channel || 'api'
            });
            return { tool: t.tool, result };
          })
        );

        const duration = Date.now() - startTime;

        for (const { tool, result } of results) {
          onEvent({
            type: 'tool_result',
            data: {
              response: result.message || 'Done.',
              structured: {
                type: result.type || this.inferResponseType(tool, result),
                data: result.data || result,
                tool,
                success: result.success !== false,
                duration: `${duration}ms`,
                suggestions: []
              }
            }
          });
        }

        onEvent({
          type: 'done',
          data: {
            suggestions: this.getSuggestions(validTools[0].tool, results[0]?.result)
          }
        });
        await this.saveConversation(userId, channel || 'api', [], userMessage, `Multi-tool: ${validTools.map(t => t.tool).join(', ')}`);
        return;
      }
    }

    // STEP 3: LLM streaming
    onEvent({ type: 'stream_start', data: {} });

    let conversationHistory = [];
    if (this.storage) {
      try {
        const conversation = await this.storage.getConversation(userId, channel || 'api');
        conversationHistory = conversation.messages || [];
      } catch (e) {}
    }

    const messages = [
      { role: 'system', content: this.buildSystemPrompt() },
      ...conversationHistory.slice(-10),
      { role: 'user', content: userMessage }
    ];

    let fullText = '';

    try {
      const response = await axios({
        method: 'post',
        url: `${this.ollamaURL}/api/chat`,
        data: {
          model: this.model,
          messages,
          stream: true
        },
        responseType: 'stream',
        timeout: 180000
      });

      let buffer = '';

      await new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter(l => l.trim());
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.message?.content) {
                buffer += json.message.content;
                fullText += json.message.content;

                // Stream tokens to client (skip if it looks like a tool call forming)
                const looksLikeToolCall = buffer.includes('```tool') || (buffer.startsWith('{') && buffer.includes('"name"'));
                if (!looksLikeToolCall) {
                  onEvent({ type: 'token', data: { text: json.message.content, fullText } });
                }
              }
              if (json.done) {
                resolve();
              }
            } catch (e) { /* partial JSON line, skip */ }
          }
        });

        response.data.on('end', resolve);
        response.data.on('error', reject);
      });

      // Check if the accumulated text contains a tool call
      const toolCallMatch = fullText.match(/```(?:tool)?\s*\n?([\s\S]*?)\n?\s*```/);
      let toolCallParsed = null;

      if (toolCallMatch) {
        try { toolCallParsed = JSON.parse(toolCallMatch[1].trim()); } catch (e) {}
      }

      if (!toolCallParsed) {
        const jsonStart = fullText.indexOf('{');
        if (jsonStart !== -1) {
          let depth = 0, jsonEnd = -1;
          for (let i = jsonStart; i < fullText.length; i++) {
            if (fullText[i] === '{') depth++;
            else if (fullText[i] === '}') { depth--; if (depth === 0) { jsonEnd = i; break; } }
          }
          if (jsonEnd !== -1) {
            try {
              const parsed = JSON.parse(fullText.substring(jsonStart, jsonEnd + 1));
              if (parsed.name && this.tools.has(parsed.name)) toolCallParsed = parsed;
            } catch (e) {}
          }
        }
      }

      // If it's a tool call, execute it
      if (toolCallParsed && toolCallParsed.name && this.tools.has(toolCallParsed.name)) {
        const toolName = toolCallParsed.name;
        const toolArgs = toolCallParsed.arguments || toolCallParsed.params || {};

        onEvent({ type: 'tool_executing', data: { tool: toolName } });

        const result = await this.executeTool(toolName, toolArgs, {
          storage: this.storage, userId, channel: channel || 'api'
        });

        const duration = Date.now() - startTime;
        const suggestions = this.getSuggestions(toolName, result);

        await this.saveConversation(userId, channel || 'api', conversationHistory, userMessage, result.message || 'Done.');

        onEvent({
          type: 'tool_result',
          data: {
            response: result.message || 'Done.',
            structured: {
              type: result.type || this.inferResponseType(toolName, result),
              data: result.data || result,
              tool: toolName,
              success: result.success !== false,
              duration: `${duration}ms`,
              suggestions
            }
          }
        });
        onEvent({ type: 'done', data: {} });
        return;
      }

    } catch (error) {
      logger.warn('Streaming failed, falling back to simple call:', error.message);
      try {
        const response = await this.callOllamaSimple(messages);
        fullText = this.extractTextResponse(response);
        onEvent({ type: 'token', data: { text: fullText, fullText } });
      } catch (e) {
        onEvent({ type: 'error', data: { message: e.message } });
        return;
      }
    }

    const duration = Date.now() - startTime;
    await this.saveConversation(userId, channel || 'api', conversationHistory, userMessage, fullText);

    const suggestions = this.getSuggestions(null, null);
    onEvent({
      type: 'done',
      data: {
        response: fullText,
        structured: {
          type: 'chat',
          data: { text: fullText },
          tool: null,
          success: true,
          duration: `${duration}ms`,
          suggestions
        }
      }
    });
  }
}

module.exports = { AgentCore };
