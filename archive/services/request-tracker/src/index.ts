import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import middie from '@fastify/middie';
import path from 'path';
import { initializeDatabase } from './services/database';
import { createTicket, getAllTickets, getTicketById, updateTicket, addComment, getTicketComments, getAllDepartments } from './services/ticket-service';
import { CreateTicketRequest, UpdateTicketRequest, CreateCommentRequest } from './types';

// DeepKit Fabric: shared auth, logging, metrics, event bus
const fabric = require('deepkit-fabric');
const { DeepKitEventBus, deepkitAuth, structuredLogger, metricsMiddleware, metricsEndpoint, healthEndpoint } = fabric;

const fastify = Fastify({ logger: true });
const PORT = parseInt(process.env.PORT || '3023', 10);

// Event Bus
export const eventBus = new DeepKitEventBus('request-tracker');

// Register plugins
const registerPlugins = async () => {
  // Enable Express middleware support
  await fastify.register(middie);
  fastify.use(structuredLogger);
  fastify.use(metricsMiddleware);
  fastify.use(deepkitAuth);

  await fastify.register(fastifyCors, { origin: '*' });
  await fastify.register(fastifyWebsocket);
  await fastify.register(fastifyStatic, { root: path.join(__dirname, '../public'), prefix: '/' });
};

// Prometheus metrics (wrap Express handler for Fastify)
fastify.get('/metrics', async (request, reply) => {
  return new Promise<void>((resolve) => {
    metricsEndpoint(request.raw, reply.raw, () => resolve());
  });
});

// Health check (enriched via fabric)
fastify.get('/health', async (request, reply) => {
  const handler = healthEndpoint({
    dependencies: [
      { name: 'database', check: async () => { try { const { pool } = require('./services/database'); await pool.query('SELECT 1'); return true; } catch { return false; } } },
      { name: 'event_bus', check: async () => !!eventBus }
    ]
  });
  return new Promise<void>((resolve) => {
    handler(request.raw, reply.raw, () => resolve());
  });
});

// Departments
fastify.get('/api/departments', async () => {
  const departments = await getAllDepartments();
  return { departments, total: departments.length };
});

// Tickets
fastify.post('/api/tickets', async (request, reply) => {
  try {
    const body = request.body as CreateTicketRequest;
    if (!body.subject || !body.departmentId) {
      return reply.status(400).send({ error: 'Missing required fields: subject, departmentId' });
    }
    const ticket = await createTicket(body);
    return ticket;
  } catch (error: any) {
    return reply.status(500).send({ error: 'Failed to create ticket', message: error.message });
  }
});

fastify.get('/api/tickets', async () => {
  const tickets = await getAllTickets();
  return { tickets, total: tickets.length };
});

fastify.get('/api/tickets/:id', async (request, reply) => {
  const id = parseInt((request.params as any).id, 10);
  const ticket = await getTicketById(id);
  if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
  return ticket;
});

fastify.put('/api/tickets/:id', async (request, reply) => {
  const id = parseInt((request.params as any).id, 10);
  const updates = request.body as UpdateTicketRequest;
  const ticket = await updateTicket(id, updates);
  if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
  return ticket;
});

fastify.get('/api/tickets/:id/comments', async (request, reply) => {
  const id = parseInt((request.params as any).id, 10);
  const comments = await getTicketComments(id);
  return { comments, total: comments.length };
});

fastify.post('/api/tickets/:id/comments', async (request, reply) => {
  try {
    const id = parseInt((request.params as any).id, 10);
    const body = request.body as CreateCommentRequest;
    if (!body.author || !body.comment) {
      return reply.status(400).send({ error: 'Missing required fields: author, comment' });
    }
    const comment = await addComment(id, body);
    return comment;
  } catch (error: any) {
    return reply.status(500).send({ error: 'Failed to add comment', message: error.message });
  }
});

const startServer = async () => {
  try {
    await registerPlugins();
    await eventBus.connect();
    await initializeDatabase();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Request Tracker running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Metrics: http://localhost:${PORT}/metrics`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
