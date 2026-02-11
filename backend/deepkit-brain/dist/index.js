"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const cors_1 = __importDefault(require("@fastify/cors"));
const static_1 = __importDefault(require("@fastify/static"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./services/database");
const agent_loop_1 = require("./services/agent-loop");
const ollama_client_1 = require("./services/ollama-client");
const fastify = (0, fastify_1.default)({ logger: true });
const PORT = parseInt(process.env.PORT || '11500', 10);
fastify.register(cors_1.default, { origin: '*' });
fastify.register(websocket_1.default);
fastify.register(static_1.default, {
    root: path_1.default.join(__dirname, '../public'),
    prefix: '/'
});
fastify.get('/health', async () => ({
    status: 'healthy',
    service: 'deepkit-brain',
    ollamaAvailable: await (0, ollama_client_1.isOllamaAvailable)(),
    timestamp: new Date().toISOString()
}));
// Get available tools
fastify.get('/api/tools', async () => {
    const tools = (0, agent_loop_1.getAvailableTools)();
    return { tools, total: tools.length };
});
// Chat endpoint
fastify.post('/api/chat', async (request, reply) => {
    try {
        const body = request.body;
        if (!body.message) {
            return reply.status(400).send({ error: 'Missing message' });
        }
        let conversationId = body.conversationId;
        if (!conversationId) {
            conversationId = (0, database_1.createConversation)();
        }
        // Get conversation history
        const messages = (0, database_1.getConversationMessages)(conversationId);
        const history = messages.map((m) => `${m.role}: ${m.content}`);
        // Save user message
        (0, database_1.addMessage)(conversationId, 'user', body.message);
        // Process with AI (now returns AgentResponse with tool execution logs)
        const agentResponse = await (0, agent_loop_1.processMessage)(body.message, history, conversationId);
        // Save assistant response
        (0, database_1.addMessage)(conversationId, 'assistant', agentResponse.response);
        return {
            response: agentResponse.response,
            conversationId,
            toolCalls: agentResponse.toolCalls,
            executionLog: agentResponse.executionLog,
            timestamp: Date.now()
        };
    }
    catch (error) {
        return reply.status(500).send({
            error: 'Chat failed',
            message: error.message
        });
    }
});
// Get conversation history
fastify.get('/api/conversations/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    const messages = (0, database_1.getConversationMessages)(id);
    return { messages, total: messages.length };
});
const startServer = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`🧠 DeepKit Brain running on port ${PORT}`);
        console.log(`🔗 API: http://localhost:${PORT}`);
        console.log(`❤️  Health: http://localhost:${PORT}/health`);
        const ollamaAvailable = await (0, ollama_client_1.isOllamaAvailable)();
        console.log(`🤖 Ollama: ${ollamaAvailable ? 'Connected' : 'Not available'}`);
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
