import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { createConversation, addMessage, getConversationMessages } from './services/database';
import { processMessage, getAvailableTools } from './services/agent-loop';
import { isOllamaAvailable } from './services/ollama-client';
import { ChatRequest } from './types';

const fastify = Fastify({ logger: true });
const PORT = parseInt(process.env.PORT || '11500', 10);

fastify.register(fastifyCors, { origin: '*' });
fastify.register(fastifyWebsocket);
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/'
});

fastify.get('/health', async () => ({
  status: 'healthy',
  service: 'deepkit-brain',
  ollamaAvailable: await isOllamaAvailable(),
  timestamp: new Date().toISOString()
}));

// Get available tools
fastify.get('/api/tools', async () => {
  const tools = getAvailableTools();
  return { tools, total: tools.length };
});

// Chat endpoint
fastify.post('/api/chat', async (request, reply) => {
  try {
    const body = request.body as ChatRequest;
    if (!body.message) {
      return reply.status(400).send({ error: 'Missing message' });
    }

    let conversationId = body.conversationId;
    if (!conversationId) {
      conversationId = createConversation();
    }

    // Get conversation history
    const messages = getConversationMessages(conversationId);
    const history = messages.map((m: any) => `${m.role}: ${m.content}`);

    // Save user message
    addMessage(conversationId, 'user', body.message);

    // Process with AI (now returns AgentResponse with tool execution logs)
    const agentResponse = await processMessage(body.message, history, conversationId);

    // Save assistant response
    addMessage(conversationId, 'assistant', agentResponse.response);

    return {
      response: agentResponse.response,
      conversationId,
      toolCalls: agentResponse.toolCalls,
      executionLog: agentResponse.executionLog,
      timestamp: Date.now()
    };
  } catch (error: any) {
    return reply.status(500).send({
      error: 'Chat failed',
      message: error.message
    });
  }
});

// Get conversation history
fastify.get<{ Params: { id: string } }>('/api/conversations/:id', async (request, reply) => {
  const id = parseInt(request.params.id, 10);
  const messages = getConversationMessages(id);
  return { messages, total: messages.length };
});

const startServer = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🧠 DeepKit Brain running on port ${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);

    const ollamaAvailable = await isOllamaAvailable();
    console.log(`🤖 Ollama: ${ollamaAvailable ? 'Connected' : 'Not available'}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
