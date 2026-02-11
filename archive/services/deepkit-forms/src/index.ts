import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import middie from '@fastify/middie';
import path from 'path';
import { initializeDatabase } from './services/database';
import {
  createForm,
  getAllForms,
  getFormById,
  addQuestion,
  getFormQuestions,
  submitResponse,
  getFormResponses
} from './services/form-service';
import { CreateFormRequest, CreateQuestionRequest, SubmitResponseRequest } from './types';

// DeepKit Fabric: shared auth, logging, metrics, event bus
const fabric = require('deepkit-fabric');
const { DeepKitEventBus, deepkitAuth, structuredLogger, metricsMiddleware, metricsEndpoint, healthEndpoint } = fabric;

const fastify = Fastify({ logger: true });
const PORT = parseInt(process.env.PORT || '3009', 10);

// Event Bus
export const eventBus = new DeepKitEventBus('deepkit-forms');

// Register plugins
const registerPlugins = async () => {
  // Enable Express middleware support
  await fastify.register(middie);
  fastify.use(structuredLogger);
  fastify.use(metricsMiddleware);
  fastify.use(deepkitAuth);

  await fastify.register(fastifyCors, { origin: '*' });
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/'
  });
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

// Forms
fastify.post('/api/forms', async (request, reply) => {
  try {
    const body = request.body as CreateFormRequest;
    if (!body.title) {
      return reply.status(400).send({ error: 'Missing required field: title' });
    }
    const form = await createForm(body);
    return form;
  } catch (error: any) {
    return reply.status(500).send({ error: 'Failed to create form', message: error.message });
  }
});

fastify.get('/api/forms', async () => {
  const forms = await getAllForms();
  return { forms, total: forms.length };
});

fastify.get<{ Params: { id: string } }>('/api/forms/:id', async (request, reply) => {
  const id = parseInt(request.params.id, 10);
  const form = await getFormById(id);
  if (!form) return reply.status(404).send({ error: 'Form not found' });
  return form;
});

// Questions
fastify.post<{ Params: { id: string } }>('/api/forms/:id/questions', async (request, reply) => {
  try {
    const id = parseInt(request.params.id, 10);
    const body = request.body as CreateQuestionRequest;
    if (!body.type || !body.questionText) {
      return reply.status(400).send({ error: 'Missing required fields: type, questionText' });
    }
    const question = await addQuestion(id, body);
    return question;
  } catch (error: any) {
    return reply.status(500).send({ error: 'Failed to add question', message: error.message });
  }
});

fastify.get<{ Params: { id: string } }>('/api/forms/:id/questions', async (request) => {
  const id = parseInt(request.params.id, 10);
  const questions = await getFormQuestions(id);
  return { questions, total: questions.length };
});

// Responses
fastify.post<{ Params: { id: string } }>('/api/forms/:id/responses', async (request, reply) => {
  try {
    const id = parseInt(request.params.id, 10);
    const body = request.body as SubmitResponseRequest;
    if (!body.answers || body.answers.length === 0) {
      return reply.status(400).send({ error: 'Missing answers' });
    }
    const response = await submitResponse(id, body);
    return response;
  } catch (error: any) {
    return reply.status(500).send({ error: 'Failed to submit response', message: error.message });
  }
});

fastify.get<{ Params: { id: string } }>('/api/forms/:id/responses', async (request) => {
  const id = parseInt(request.params.id, 10);
  const responses = await getFormResponses(id);
  return { responses, total: responses.length };
});

const startServer = async () => {
  try {
    await registerPlugins();
    await eventBus.connect();
    await initializeDatabase();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`DeepKit Forms running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Metrics: http://localhost:${PORT}/metrics`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
