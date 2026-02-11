import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TelegramAdapter, WebAdapter } from './adapters';
import { SessionManager } from './services/session-manager';
import { CoreAPIClient } from './services/core-api-client';
import { GatewayMessage } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;

// Initialize services
const sessionManager = new SessionManager();
const coreAPI = new CoreAPIClient();
const adapters: any[] = [];

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const coreHealthy = await coreAPI.healthCheck();
  res.json({
    status: 'healthy',
    service: 'gateway',
    coreAPI: coreHealthy ? 'connected' : 'disconnected',
    adapters: adapters.map(a => a.channel),
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/status', (req: Request, res: Response) => {
  res.json({
    service: 'DeepKit Gateway',
    version: '0.5.0',
    adapters: adapters.map(a => ({
      channel: a.channel,
      status: 'active'
    })),
    uptime: process.uptime()
  });
});

// Webhook endpoint for WhatsApp (via n8n)
app.post('/webhook/whatsapp', async (req: Request, res: Response) => {
  try {
    const { from, body, profileName } = req.body;
    
    const message: GatewayMessage = {
      id: `whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channel: 'whatsapp',
      userId: from,
      text: body,
      metadata: {
        chatId: from,
        username: profileName,
        raw: req.body
      },
      timestamp: new Date()
    };

    await handleMessage(message);
    res.json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Direct message endpoint (for testing)
app.post('/api/message', async (req: Request, res: Response) => {
  try {
    const { channel, userId, text, chatId } = req.body;
    
    const message: GatewayMessage = {
      id: `${channel}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channel: channel || 'cli',
      userId: userId || 'test_user',
      text,
      metadata: {
        chatId: chatId || userId || 'test_chat'
      },
      timestamp: new Date()
    };

    const response = await handleMessage(message);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Message endpoint error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Main message handler
async function handleMessage(message: GatewayMessage): Promise<string> {
  console.log(`📨 [${message.channel.toUpperCase()}] ${message.userId}: ${message.text}`);

  try {
    // Get or create session
    const session = await sessionManager.getOrCreateSession(
      message.userId,
      message.channel,
      message.metadata.chatId || message.userId
    );

    // Send to Core API
    const coreResponse = await coreAPI.sendMessage({
      message: message.text,
      sessionId: session.id,
      userId: message.userId,
      channel: message.channel,
      context: session.context
    });

    // Update session context if provided
    if (coreResponse.metadata?.context) {
      await sessionManager.updateSessionContext(session.id, coreResponse.metadata.context);
    }

    // Send response back through appropriate channel
    await sendResponse(message, coreResponse.response);

    return coreResponse.response;
  } catch (error) {
    console.error('Message handling error:', error);
    const errorMessage = '❌ Sorry, I encountered an error processing your message.';
    await sendResponse(message, errorMessage);
    return errorMessage;
  }
}

// Send response back through the appropriate adapter
async function sendResponse(message: GatewayMessage, text: string): Promise<void> {
  const adapter = adapters.find(a => a.channel === message.channel);
  
  if (adapter) {
    await adapter.sendMessage(message.metadata.chatId || message.userId, text);
  } else {
    console.warn(`No adapter found for channel: ${message.channel}`);
  }
}

// Initialize adapters
async function initializeAdapters(): Promise<void> {
  console.log('🔌 Initializing channel adapters...');

  // Telegram
  const telegram = new TelegramAdapter();
  telegram.onMessage(handleMessage);
  await telegram.initialize();
  adapters.push(telegram);

  // WebSocket
  const web = new WebAdapter(3334);
  web.onMessage(handleMessage);
  await web.initialize();
  adapters.push(web);

  console.log(`✅ ${adapters.length} adapters initialized`);
}

// Start server
async function start(): Promise<void> {
  try {
    await initializeAdapters();

    app.listen(PORT, () => {
      console.log(`\n🚀 DeepKit Gateway v0.5.0 running on port ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Status: http://localhost:${PORT}/status\n`);
    });
  } catch (error) {
    console.error('Failed to start gateway:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await sessionManager.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await sessionManager.cleanup();
  process.exit(0);
});

// Start
start();
