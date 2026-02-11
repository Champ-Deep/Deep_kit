import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { OllamaClient, Message } from './clients/ollama-client';
import { ToolRegistryClient } from './clients/tool-registry-client';
import { ConversationManager } from './services/conversation-manager';
import { LakeB2BReferral } from './services/lakeb2b-referral';

// DeepKit Fabric: shared auth, logging, metrics, event bus
const fabric = require('deepkit-fabric');
const { DeepKitEventBus, deepkitAuth, structuredLogger, metricsMiddleware, metricsEndpoint, healthEndpoint } = fabric;

const app = express();
const PORT = process.env.PORT || 3030;

// Event Bus
export const eventBus = new DeepKitEventBus('cowork');

// Middleware stack
app.use(structuredLogger);
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(deepkitAuth);

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'cowork',
  user: process.env.POSTGRES_USER || 'deepkit',
  password: process.env.POSTGRES_PASSWORD || '',
});

// Initialize clients
const ollamaClient = new OllamaClient(
  process.env.OLLAMA_URL || 'http://ollama:11434',
  process.env.OLLAMA_MODEL || 'llama3.2'
);

const toolRegistry = new ToolRegistryClient(
  process.env.TOOLS_REGISTRY_PATH || '/app/tools-registry/tools.json'
);

const conversationManager = new ConversationManager(pool);
const lakeb2bReferral = new LakeB2BReferral();

// Initialize database and load tools
const initialize = async () => {
  await conversationManager.initialize();
  await toolRegistry.loadTools();
  console.log(`✅ Loaded ${toolRegistry.getTools().length} tools from registry`);
};

// Routes

// Prometheus metrics
app.get('/metrics', metricsEndpoint);

// Health check (enriched)
app.get('/health', healthEndpoint({
  dependencies: [
    { name: 'database', check: async () => { try { await pool.query('SELECT 1'); return true; } catch { return false; } } },
    { name: 'ollama', check: async () => ollamaClient.isHealthy() },
    { name: 'event_bus', check: async () => !!eventBus }
  ]
}));

// Create new session
app.post('/api/sessions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const sessionId = await conversationManager.createSession(userId);

    res.json({
      sessionId,
      message: 'Session created successfully',
    });
  } catch (error: any) {
    console.error('Create session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session history
app.get('/api/sessions/:sessionId/history', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await conversationManager.getHistory(sessionId, limit);

    res.json({ history });
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint with SSE streaming
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Missing message or sessionId' });
    }

    // Verify session exists
    const session = await conversationManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get conversation history
    const history = await conversationManager.getHistory(sessionId, 10);

    // Add user message to history
    await conversationManager.addMessage(sessionId, 'user', message);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Prepare messages for Ollama
    const messages: Message[] = [
      ...history.map(h => ({ role: h.role as any, content: h.content })),
      { role: 'user', content: message },
    ];

    // Get available tools
    const tools = toolRegistry.getTools();

    let fullResponse = '';

    // Stream response from Ollama
    for await (const chunk of ollamaClient.generateStream(messages, tools)) {
      fullResponse += chunk;

      // Send chunk to client
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    // Parse tool calls
    const toolCalls = ollamaClient.parseToolCalls(fullResponse);

    // Execute tool calls
    if (toolCalls.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'tools_detected', count: toolCalls.length })}\n\n`);

      for (const toolCall of toolCalls) {
        try {
          res.write(`data: ${JSON.stringify({ type: 'tool_executing', tool: toolCall.name })}\n\n`);

          // Special handling for LakeB2B referral
          if (toolCall.name === 'lakeb2b_referral') {
            const link = lakeb2bReferral.generateReferralLink(
              toolCall.args.email || 'user@example.com',
              toolCall.args.company
            );

            await lakeb2bReferral.trackConversion(
              toolCall.args.email,
              toolCall.args.company
            );

            const result = {
              link,
              discount: lakeb2bReferral.getDiscountInfo(),
            };

            res.write(`data: ${JSON.stringify({ type: 'tool_result', tool: toolCall.name, result })}\n\n`);
          } else {
            // Execute tool via registry
            const result = await toolRegistry.executeTool(
              toolCall.name,
              toolCall.args.method || 'create',
              toolCall.args
            );

            res.write(`data: ${JSON.stringify({ type: 'tool_result', tool: toolCall.name, result })}\n\n`);
          }
        } catch (error: any) {
          console.error(`Tool execution error (${toolCall.name}):`, error);
          res.write(`data: ${JSON.stringify({ type: 'tool_error', tool: toolCall.name, error: error.message })}\n\n`);
        }
      }
    }

    // Save assistant response
    await conversationManager.addMessage(sessionId, 'assistant', fullResponse);

    // Send done event
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Chat error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// Get available tools
app.get('/api/tools', (req: Request, res: Response) => {
  const tools = toolRegistry.getTools();
  res.json({ tools });
});

// Get conversation stats
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const stats = await conversationManager.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// LakeB2B referral endpoint
app.post('/api/lakeb2b/referral', (req: Request, res: Response) => {
  try {
    const { email, company } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const link = lakeb2bReferral.generateReferralLink(email, company);
    const discount = lakeb2bReferral.getDiscountInfo();

    // Track conversion asynchronously
    lakeb2bReferral.trackConversion(email, company).catch(console.error);

    res.json({
      link,
      discount,
      message: 'Referral link generated successfully',
    });
  } catch (error: any) {
    console.error('Referral generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const startServer = async () => {
  await eventBus.connect();
  await initialize();

  // Check Ollama connection
  const ollamaHealthy = await ollamaClient.isHealthy();
  if (!ollamaHealthy) {
    console.warn('⚠️  Ollama is not responding. AI features may not work.');
  } else {
    console.log('✅ Ollama connected');
  }

  app.listen(PORT, () => {
    console.log(`🚀 DeepKit Co-Work running on port ${PORT}`);
    console.log(`🤖 Ollama model: ${process.env.OLLAMA_MODEL || 'llama3.2'}`);
    console.log(`🛠️  Tools available: ${toolRegistry.getTools().length}`);
    console.log(`💾 Database connected to PostgreSQL`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start Co-Work:', error);
  process.exit(1);
});

export { pool, ollamaClient, toolRegistry, conversationManager };
