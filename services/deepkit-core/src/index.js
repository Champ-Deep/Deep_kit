const express = require('express');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
require('dotenv').config();

// Core components
const { MessageBroker } = require('./core/MessageBroker');
const { DeepKitStorage } = require('./storage/DeepKitStorage');

// Adapters
const { WhatomateAdapter } = require('./adapters/WhatomateAdapter');
const { CLIAdapter } = require('./adapters/CLIAdapter');

// Docker Service Discovery (for Hub functionality)
const DockerServiceDiscovery = require('./discovery/docker-discovery');

// Agent Core (will be integrated in Phase 4)
let AgentCore;
try {
  const agentCoreModule = require('./core/AgentCore');
  AgentCore = agentCoreModule.AgentCore;
} catch (error) {
  // AgentCore not yet implemented
  AgentCore = null;
}

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

// Application state
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Try again in a minute.' },
});
app.use('/api/', apiLimiter);

// Internal API token for webhook/service-to-service endpoints
const DEEPKIT_INTERNAL_TOKEN = process.env.DEEPKIT_INTERNAL_TOKEN;
function requireToken(req, res, next) {
  if (!DEEPKIT_INTERNAL_TOKEN) return next();
  const token = req.headers['x-deepkit-token'] || req.query.token;
  if (token === DEEPKIT_INTERNAL_TOKEN) return next();
  return res.status(401).json({ error: 'Invalid or missing API token' });
}

// Request metrics
let requestCounter = 0;
let successCounter = 0;
let errorCounter = 0;
const startTime = Date.now();

// Initialize components
let storage;
let messageBroker;
let agentCore;
let dockerDiscovery;

async function initialize() {
  // Initialize DeepKit storage
  storage = new DeepKitStorage();
  await storage.initialize();
  logger.info('DeepKit storage initialized');

  // Initialize message broker
  messageBroker = new MessageBroker();

  // Register Whatomate adapter (WhatsApp)
  messageBroker.registerChannel('whatsapp', new WhatomateAdapter());
  logger.info('Whatomate adapter registered');

  // Register CLI adapter (for testing)
  messageBroker.registerChannel('cli', new CLIAdapter());
  logger.info('CLI adapter registered');

  // Initialize Docker Service Discovery
  dockerDiscovery = new DockerServiceDiscovery();
  if (dockerDiscovery.isAvailable()) {
    await dockerDiscovery.discoverServices();
    logger.info('Docker service discovery initialized');
  } else {
    logger.warn('Docker not available - using static service list');
  }

  // Initialize AgentCore if available
  if (AgentCore) {
    agentCore = new AgentCore({
      storage,
      messageBroker,
      ollamaURL: process.env.OLLAMA_BASE_URL || 'http://ollama:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.2:latest'
    });
    await agentCore.initialize();
    logger.info('AgentCore initialized - full intelligence enabled');
  } else {
    logger.warn('AgentCore not available - running in echo mode');
  }
}

// Request logging middleware
app.use((req, res, next) => {
  requestCounter++;
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (res.statusCode >= 400) {
      errorCounter++;
    } else {
      successCounter++;
    }
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
});

// ============================================
// Static File Serving (Web Chat UI)
// ============================================

// Serve static files - prefer React build (public/dist) if available, fallback to public
const distPath = path.join(__dirname, '..', 'public', 'dist');
const publicPath = path.join(__dirname, '..', 'public');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  logger.info('Serving React UI from public/dist');
} else {
  app.use(express.static(publicPath));
  logger.info('Serving legacy UI from public/');
}

// Root route - serve React build or fallback HTML
app.get('/', (req, res) => {
  const reactIndex = path.join(distPath, 'index.html');
  const legacyIndex = path.join(publicPath, 'index.html');
  res.sendFile(fs.existsSync(reactIndex) ? reactIndex : legacyIndex);
});

// ============================================
// DeepKit Hub Integration Endpoints
// ============================================

/**
 * Health check endpoint for DeepKit Hub
 * Provides detailed status for COMMAND CENTER bay
 */
app.get('/health', async (req, res) => {
  try {
    // Check storage health
    const storageHealth = storage ? await storage.getHealth() : { status: 'not_initialized' };

    // Check service connections
    const connections = {
      postgres: storageHealth.connected || false,
      ollama: await checkOllamaHealth(),
      n8n: await checkN8nHealth()
    };

    const allConnected = Object.values(connections).every(c => c === true);

    const health = {
      service: 'DeepKit Core',
      bay: 'COMMAND_CENTER',
      port: parseInt(process.env.PORT) || 7777,
      status: allConnected ? 'healthy' : 'degraded',
      version: '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),

      // DeepKit metrics
      metrics: {
        cpu: process.cpuUsage(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        },
        requests: {
          total: requestCounter,
          success: successCounter,
          errors: errorCounter
        }
      },

      // Service connections
      connections,

      // Storage status
      storage: storageHealth,

      // Channel status
      channels: messageBroker ? Array.from(messageBroker.channels.keys()) : [],

      // Agent status
      agentCore: agentCore ? 'enabled' : 'disabled',

      timestamp: new Date().toISOString()
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      service: 'DeepKit Core',
      bay: 'COMMAND_CENTER',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DeepCard endpoint for Hub dashboard widget
 */
app.get('/api/deepcard', async (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Get recent stats from storage
  let messagesProcessed = 0;
  let toolsCalled = 0;
  let activeConversations = 0;

  if (storage) {
    try {
      const stats = await storage.getHealth();
      messagesProcessed = stats.stats?.transaction_count || 0;
      activeConversations = stats.stats?.conversation_count || 0;
    } catch (error) {
      logger.warn('Could not fetch storage stats:', error.message);
    }
  }

  res.json({
    title: 'DeepKit Core',
    subtitle: 'COMMAND CENTER',
    status: 'active',
    port: parseInt(process.env.PORT) || 7777,

    // Stats for widget
    stats: {
      'Messages': messagesProcessed,
      'Tools Called': toolsCalled,
      'Active Chats': activeConversations,
      'Uptime': formatUptime(uptime)
    },

    // Live metrics
    liveMetrics: {
      cpu: Math.round(process.cpuUsage().user / 1000000),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      requests: requestCounter
    },

    // Quick actions
    actions: [
      { label: 'Test CLI', endpoint: '/cli' },
      { label: 'View Logs', endpoint: '/logs' },
      { label: 'Health Check', endpoint: '/health' }
    ]
  });
});

// ============================================
// Webhook Endpoints
// ============================================

/**
 * Channel-agnostic webhook endpoint
 * Receives messages from any registered channel (WhatsApp, CLI, etc.)
 */
app.post('/webhook/:channelId', requireToken, async (req, res) => {
  const { channelId } = req.params;

  try {
    // Check if channel is registered
    if (!messageBroker || !messageBroker.hasChannel(channelId)) {
      return res.status(404).json({
        error: `Channel not registered: ${channelId}`,
        availableChannels: messageBroker ? Array.from(messageBroker.channels.keys()) : []
      });
    }

    // Parse message via channel adapter
    const message = await messageBroker.processMessage(channelId, req.body);

    logger.info('Message received', {
      channel: channelId,
      sender: message.sender,
      contentPreview: message.content.substring(0, 50)
    });

    // Log transaction
    if (storage) {
      await storage.logTransaction({
        type: 'message_received',
        action: 'incoming_message',
        userId: message.sender,
        channel: channelId,
        details: {
          messageId: message.id,
          contentLength: message.content.length
        },
        status: 'received'
      });
    }

    // Process with AgentCore if available
    let result;
    if (agentCore) {
      result = await agentCore.processMessage(message);
    } else {
      // Fallback echo mode
      result = `Received: "${message.content.substring(0, 100)}"`;
    }

    // Extract text for text-based channels (WhatsApp, Telegram)
    const responseText = (result && typeof result === 'object' && result.message) ? result.message : String(result);

    // Send response via channel
    await messageBroker.sendResponse(channelId, message.sender, responseText);

    res.json({
      success: true,
      messageId: message.id,
      processed: true
    });

  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * WhatsApp webhook verification (for Whatomate)
 */
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATOMATE_VERIFY_TOKEN || 'deepkit-verify';

  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Verification failed');
  }
});

// ============================================
// Chat API (Direct Test Endpoint)
// ============================================

/**
 * Direct chat endpoint for testing tool calling
 * POST /api/chat { message: "...", from: "user-id" }
 */
app.post('/api/chat', async (req, res) => {
  const { message, from } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required', usage: 'POST /api/chat { "message": "...", "from": "user-id" }' });
  }

  const userId = from || 'api-user';

  try {
    if (!agentCore) {
      return res.status(503).json({ error: 'AgentCore not initialized. THE BRAIN may be offline.' });
    }

    // Build a normalized message object matching what webhook handlers produce
    const normalizedMessage = {
      id: `api-${Date.now()}`,
      sender: userId,
      content: message,
      timestamp: new Date().toISOString(),
      channel: 'api',
      metadata: { source: 'api-chat' }
    };

    const startTime = Date.now();
    const result = await agentCore.processMessage(normalizedMessage);
    const duration = Date.now() - startTime;

    // Extract tool execution metadata if available
    const toolMetadata = agentCore.lastToolExecuted || {};

    // Handle both structured (new) and string (legacy) response formats
    const isStructured = result && typeof result === 'object' && result.message;
    const responseText = isStructured ? result.message : (typeof result === 'string' ? result : String(result));
    const structured = isStructured ? result.structured : null;

    res.json({
      success: true,
      response: responseText,
      structured: structured,
      metadata: {
        from: userId,
        duration: `${duration}ms`,
        model: agentCore.model,
        tools_available: Array.from(agentCore.tools.keys()),
        tool_used: toolMetadata.name || null,
        tool_args: toolMetadata.args || null
      }
    });

  } catch (error) {
    logger.error('Chat API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// SSE Streaming Chat Endpoint
// ============================================

app.post('/api/chat/stream', async (req, res) => {
  const { message, from } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const userId = from || 'web-ui-v2';

  if (!agentCore) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'AgentCore not initialized.' })}\n\n`);
    res.end();
    return;
  }

  const normalizedMessage = {
    id: `stream-${Date.now()}`,
    sender: userId,
    content: message,
    timestamp: new Date().toISOString(),
    channel: 'api',
    metadata: { source: 'api-chat-stream' }
  };

  try {
    await agentCore.processMessageStream(normalizedMessage, (event) => {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    });
  } catch (error) {
    logger.error('Stream error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
  }

  res.end();
});

// ============================================
// Conversation History Endpoint
// ============================================

app.get('/api/conversations/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!storage) {
    return res.status(503).json({ error: 'Storage not initialized' });
  }

  try {
    const conversation = await storage.getConversation(userId, 'api');
    const messages = conversation.messages || [];

    const crayonMessages = messages.map((msg, idx) => ({
      id: `hist-${idx}`,
      role: msg.role,
      ...(msg.role === 'user'
        ? { type: 'prompt', message: msg.content }
        : { message: [{ type: 'text', text: msg.content }] }
      )
    }));

    res.json({ success: true, messages: crayonMessages, count: crayonMessages.length });
  } catch (error) {
    res.json({ success: true, messages: [], count: 0 });
  }
});

// ============================================
// Real-time Event Stream (SSE Push)
// ============================================

const eventClients = new Set();

app.get('/api/events/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
  eventClients.add(res);

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    eventClients.delete(res);
    clearInterval(heartbeat);
  });
});

function broadcastEvent(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of eventClients) {
    try { client.write(payload); } catch (e) { eventClients.delete(client); }
  }
}

app.set('broadcastEvent', broadcastEvent);

// ============================================
// API Endpoints
// ============================================

/**
 * Get registered channels
 */
app.get('/api/channels', (req, res) => {
  res.json({
    channels: messageBroker ? Array.from(messageBroker.channels.keys()) : [],
    count: messageBroker ? messageBroker.channels.size : 0
  });
});

// ============================================
// Setup / First-Run Endpoints
// ============================================

/**
 * Get setup status for first-run wizard
 */
app.get('/api/setup/status', async (req, res) => {
  try {
    // Check if setup has been completed
    let firstRun = true;
    if (storage) {
      const setupComplete = await storage.getSetting('setup_complete');
      firstRun = !setupComplete;
    }

    // Check Ollama health and available models
    const axios = require('axios');
    const ollamaURL = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
    let ollamaConnected = false;
    let models = [];

    try {
      const tagsRes = await axios.get(`${ollamaURL}/api/tags`, { timeout: 5000 });
      ollamaConnected = true;
      models = (tagsRes.data?.models || []).map((m) => m.name);
    } catch {
      // Ollama not available
    }

    // Get services count
    let servicesCount = 0;
    if (dockerDiscovery) {
      const services = await dockerDiscovery.discoverServices();
      servicesCount = services.length;
    }

    // Check Postgres health
    const storageHealth = storage ? await storage.getHealth() : { connected: false };

    res.json({
      firstRun,
      ollama: ollamaConnected,
      models,
      servicesCount,
      postgres: storageHealth.connected || false,
    });
  } catch (error) {
    logger.error('Setup status check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark setup as complete
 */
app.post('/api/setup/complete', async (req, res) => {
  try {
    if (storage) {
      await storage.setSetting('setup_complete', { completed: true, timestamp: new Date().toISOString() });
    }
    res.json({ success: true, message: 'Setup complete' });
  } catch (error) {
    logger.error('Setup complete failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Service Discovery Endpoints (Hub Integration)
// ============================================

/**
 * Get all services with health status
 */
app.get('/api/services/health', async (req, res) => {
  try {
    const services = await dockerDiscovery.checkAllHealth();
    res.json({
      type: 'service_grid',
      data: {
        services,
        count: services.length,
        dockerAvailable: dockerDiscovery.isAvailable()
      }
    });
  } catch (error) {
    logger.error('Service health check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Force refresh service discovery
 */
app.get('/api/services/discover', async (req, res) => {
  try {
    const services = await dockerDiscovery.discoverServices(true);
    res.json({
      services,
      count: services.length,
      dockerAvailable: dockerDiscovery.isAvailable(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Service discovery failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get logs for a specific service
 */
app.get('/api/services/:name/logs', async (req, res) => {
  const { name } = req.params;
  const tail = parseInt(req.query.tail) || 50;

  try {
    const logs = await dockerDiscovery.getContainerLogs(name, tail);
    res.json({
      service: name,
      logs,
      tail
    });
  } catch (error) {
    logger.error(`Failed to get logs for ${name}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get recent logs/metrics
 */
app.get('/logs', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  // Return basic log info
  res.json({
    message: 'Logs available via Docker: docker logs deepkit-messenger',
    metrics: {
      totalRequests: requestCounter,
      successfulRequests: successCounter,
      failedRequests: errorCounter,
      uptime: formatUptime(Math.floor((Date.now() - startTime) / 1000))
    }
  });
});

// ============================================
// Helper Functions
// ============================================

async function checkOllamaHealth() {
  const axios = require('axios');
  const ollamaURL = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';

  try {
    await axios.get(`${ollamaURL}/api/tags`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function checkN8nHealth() {
  const axios = require('axios');
  const n8nURL = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678';

  try {
    await axios.get(`${n8nURL}/healthz`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// ============================================
// Error Handling
// ============================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    availableEndpoints: [
      'GET /health',
      'GET /api/deepcard',
      'POST /webhook/:channelId',
      'GET /api/channels'
    ]
  });
});

// ============================================
// Startup
// ============================================

const PORT = parseInt(process.env.PORT) || 7777;

initialize()
  .then(() => {
    app.listen(PORT, () => {
      logger.info('='.repeat(60));
      logger.info('  DeepKit Core - COMMAND CENTER');
      logger.info('='.repeat(60));
      logger.info(`  Port: ${PORT}`);
      logger.info(`  Bay: COMMAND_CENTER (THE FACE range)`);
      logger.info(`  Channels: ${Array.from(messageBroker.channels.keys()).join(', ')}`);
      logger.info(`  Storage: DeepKit Postgres`);
      logger.info(`  Intelligence: ${agentCore ? 'Enabled' : 'Echo Mode'}`);
      logger.info('='.repeat(60));
      logger.info('');
      logger.info('Endpoints:');
      logger.info(`  Web UI:   http://localhost:${PORT}/`);
      logger.info(`  Health:   http://localhost:${PORT}/health`);
      logger.info(`  Chat API: http://localhost:${PORT}/api/chat`);
      logger.info(`  DeepCard: http://localhost:${PORT}/api/deepcard`);
      logger.info(`  Webhook:  http://localhost:${PORT}/webhook/:channelId`);
      logger.info('');
    });
  })
  .catch((error) => {
    logger.error('Failed to initialize:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  if (storage) {
    await storage.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  if (storage) {
    await storage.close();
  }
  process.exit(0);
});
