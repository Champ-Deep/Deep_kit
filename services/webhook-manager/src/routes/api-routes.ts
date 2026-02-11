import { Router } from 'express';
import {
  getEndpoints,
  createEndpoint,
  updateEndpoint,
  toggleEndpoint,
  deleteEndpoint,
  getEvents,
  createEvent,
  dispatchEvent,
  retryEvent,
  getStats
} from '../services/database';

const router = Router();

// Endpoints
router.get('/endpoints', async (req, res) => {
  try {
    const endpoints = await getEndpoints();
    res.json(endpoints);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/endpoints', async (req, res) => {
  try {
    const endpoint = await createEndpoint(req.body);
    res.status(201).json(endpoint);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/endpoints/:id', async (req, res) => {
  try {
    const endpoint = await updateEndpoint(parseInt(req.params.id, 10), req.body);
    if (endpoint) {
      res.json(endpoint);
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/endpoints/:id/toggle', async (req, res) => {
  try {
    const endpoint = await toggleEndpoint(parseInt(req.params.id, 10));
    if (endpoint) {
      res.json(endpoint);
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/endpoints/:id', async (req, res) => {
  try {
    const deleted = await deleteEndpoint(parseInt(req.params.id, 10));
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Events
router.get('/events', async (req, res) => {
  try {
    const { status, event_type } = req.query;
    const events = await getEvents(status as string | undefined, event_type as string | undefined);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/events', async (req, res) => {
  try {
    const event = await createEvent(req.body);
    res.status(201).json(event);
    // Dispatch asynchronously
    setTimeout(() => dispatchEvent(event.id), 100);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/events/:id/retry', async (req, res) => {
  try {
    await retryEvent(parseInt(req.params.id, 10));
    res.json({ message: 'Event retry initiated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
