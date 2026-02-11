import { Router } from 'express';
import {
  getAllServicesHealth,
  listDockerContainers,
  startContainer,
  stopContainer,
  restartContainer,
  getContainerLogs,
  getAllDatabasesInfo,
  getSystemStats
} from '../services/monitor';

const router = Router();

// Service Monitoring
router.get('/services', async (req, res) => {
  try {
    const services = await getAllServicesHealth();
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Docker Management
router.get('/docker/containers', async (req, res) => {
  try {
    const containers = await listDockerContainers();
    res.json(containers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/docker/containers/:name/start', async (req, res) => {
  try {
    const result = await startContainer(req.params.name);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/docker/containers/:name/stop', async (req, res) => {
  try {
    const result = await stopContainer(req.params.name);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/docker/containers/:name/restart', async (req, res) => {
  try {
    const result = await restartContainer(req.params.name);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/docker/containers/:name/logs', async (req, res) => {
  try {
    const lines = req.query.lines ? parseInt(req.query.lines as string, 10) : 100;
    const logs = await getContainerLogs(req.params.name, lines);
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Database Management
router.get('/databases', async (req, res) => {
  try {
    const databases = await getAllDatabasesInfo();
    res.json(databases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// System Stats
router.get('/system/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
