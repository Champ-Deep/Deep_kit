// @ts-nocheck
import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as db from '../services/database';
import { SendRequestRequest } from '../types';

const router = Router();

// Collections
router.get('/collections', (req: Request, res: Response) => {
  try {
    const collections = db.getCollections();
    return res.json({ collections, total: collections.length, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

router.post('/collections', (req: Request, res: Response) => {
  try {
    const requestBody = req.body as any;
    const { name, description } = requestBody;
    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' });
    }
    const id = db.createCollection(name, description || null);
    const collection = db.getCollectionById(id as number);
    return res.json({ collection, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create collection' });
  }
});

router.delete('/collections/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    db.deleteCollection(id);
    return res.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// Requests
router.get('/requests', (req: Request, res: Response) => {
  try {
    const collectionId = req.query.collection_id ? parseInt(req.query.collection_id as string, 10) : undefined;
    const requests = db.getRequests(collectionId);
    return res.json({ requests, total: requests.length, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

router.get('/requests/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const request = db.getRequestById(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    return res.json({ request, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch request' });
  }
});

router.post('/requests', (req: Request, res: Response) => {
  try {
    const requestBody = req.body as any;
    const { name, method, url, collection_id, headers, body, body_type } = requestBody;
    if (!name || !method || !url) {
      return res.status(400).json({ error: 'Name, method, and URL are required' });
    }

    const headersJson = headers ? JSON.stringify(headers) : null;
    const id = db.createRequest(
      name,
      method.toUpperCase(),
      url,
      collection_id || null,
      headersJson,
      body || null,
      body_type || null
    );

    const request = db.getRequestById(id as number);
    return res.json({ request, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create request' });
  }
});

router.put('/requests/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const requestBody = req.body as any;
    const { name, method, url, headers, body, body_type } = requestBody;

    if (!name || !method || !url) {
      return res.status(400).json({ error: 'Name, method, and URL are required' });
    }

    const headersJson = headers ? JSON.stringify(headers) : null;
    db.updateRequest(id, name, method.toUpperCase(), url, headersJson, body || null, body_type || null);

    const request = db.getRequestById(id);
    return res.json({ request, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update request' });
  }
});

router.delete('/requests/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    db.deleteRequest(id);
    return res.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete request' });
  }
});

// Send request (proxy)
router.post('/requests/:id/send', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const id = parseInt(req.params.id, 10);
    const savedRequest = db.getRequestById(id);

    if (!savedRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Parse saved request
    const method = savedRequest.method.toLowerCase();
    const url = savedRequest.url;
    const headers = savedRequest.headers ? JSON.parse(savedRequest.headers) : {};
    const body = savedRequest.body;

    // Replace environment variables
    const activeEnv = db.getActiveEnvironment();
    let finalUrl = url;
    let finalHeaders = headers;
    let finalBody = body;

    if (activeEnv) {
      const env = activeEnv as any;
      const variables = JSON.parse(env.variables as string);
      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        finalUrl = finalUrl.replace(new RegExp(placeholder, 'g'), variables[key]);
        if (finalBody) {
          finalBody = finalBody.replace(new RegExp(placeholder, 'g'), variables[key]);
        }
      });
    }

    // Make request
    const response = await axios({
      method: method as any,
      url: finalUrl,
      headers: finalHeaders,
      data: finalBody,
      validateStatus: () => true // Don't throw on any status code
    });

    const responseTime = Date.now() - startTime;
    const responseSize = JSON.stringify(response.data).length;

    // Save to history
    db.addHistoryEntry(id, response.status, responseTime, responseSize);

    return res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      responseTime,
      responseSize,
      timestamp: Date.now()
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return res.status(500).json({
      error: 'Request failed',
      message: error.message,
      responseTime,
      timestamp: Date.now()
    });
  }
});

// Direct send (without saving)
router.post('/send', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { method, url, headers, body }: SendRequestRequest = req.body;

    if (!method || !url) {
      return res.status(400).json({ error: 'Method and URL are required' });
    }

    const response = await axios({
      method: method.toLowerCase() as any,
      url,
      headers: headers || {},
      data: body,
      validateStatus: () => true
    });

    const responseTime = Date.now() - startTime;
    const responseSize = JSON.stringify(response.data).length;

    // Save to history (no request_id)
    db.addHistoryEntry(null, response.status, responseTime, responseSize);

    return res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      responseTime,
      responseSize,
      timestamp: Date.now()
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return res.status(500).json({
      error: 'Request failed',
      message: error.message,
      responseTime,
      timestamp: Date.now()
    });
  }
});

// Environments
router.get('/environments', (req: Request, res: Response) => {
  try {
    const environments = db.getEnvironments();
    return res.json({ environments, total: environments.length, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch environments' });
  }
});

router.post('/environments', (req: Request, res: Response) => {
  try {
    const requestBody = req.body as any;
    const { name, variables, active } = requestBody;
    if (!name || !variables) {
      return res.status(400).json({ error: 'Name and variables are required' });
    }

    const variablesJson = typeof variables === 'string' ? variables : JSON.stringify(variables);
    const id = db.createEnvironment(name, variablesJson, active ? 1 : 0);

    return res.json({ id, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create environment' });
  }
});

router.put('/environments/:id/activate', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    db.setActiveEnvironment(id);
    return res.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to activate environment' });
  }
});

router.delete('/environments/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    db.deleteEnvironment(id);
    return res.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete environment' });
  }
});

// History
router.get('/history', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const history = db.getHistory(limit);
    return res.json({ history, total: history.length, timestamp: Date.now() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
