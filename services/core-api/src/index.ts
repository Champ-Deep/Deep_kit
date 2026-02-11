import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenCodeClient } from './services/opencode-client';
import { ToolRegistry } from './services/tool-registry';
import { ConversationStore } from './services/conversation-store';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7777;

// Initialize services
const openCode = new OpenCodeClient();
const toolRegistry = new ToolRegistry();
const conversationStore = new ConversationStore();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'core-api',
    version: '0.5.0',
    timestamp: new Date().toISOString()
  });
});

// Main chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, sessionId, userId, channel, context } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields: message, sessionId'
      });
    }

    console.log(`🤖 [${channel || 'unknown'}] Processing: ${message}`);

    // Get conversation history
    const history = await conversationStore.getHistory(sessionId);

    // Process through OpenCode
    const response = await openCode.processMessage({
      message,
      sessionId,
      userId,
      history,
      context
    });

    // Handle tool calls if present
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        console.log(`🔧 Executing tool: ${toolCall.tool}.${toolCall.method}`);
        const result = await toolRegistry.execute(toolCall);
        
        // Add tool result to context
        response.metadata = {
          ...response.metadata,
          toolResults: [...(response.metadata?.toolResults || []), result]
        };
      }
    }

    // Store the exchange
    await conversationStore.addExchange(sessionId, message, response.response);

    res.json({
      response: response.response,
      actions: response.toolCalls,
      metadata: response.metadata
    });

  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get available tools
app.get('/api/tools', (req: Request, res: Response) => {
  const tools = toolRegistry.getAvailableTools();
  res.json({ tools });
});

// Get conversation history
app.get('/api/conversations/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const history = await conversationStore.getHistory(sessionId);
    res.json({ sessionId, history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Task Tracker proxy endpoints
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const response = await toolRegistry.execute({
      tool: 'task_tracker',
      method: 'list_tasks',
      params: req.query
    });
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req: Request, res: Response) => {
  try {
    const response = await toolRegistry.execute({
      tool: 'task_tracker',
      method: 'create_task',
      params: req.body
    });
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🧠 DeepKit Core API v0.5.0 running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Chat API: http://localhost:${PORT}/api/chat\n`);
});
