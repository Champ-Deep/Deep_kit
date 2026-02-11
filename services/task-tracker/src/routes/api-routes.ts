import { Router } from 'express';
import {
  getProjects,
  createProject,
  deleteProject,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getUserStats,
  getAchievements,
  getStats
} from '../services/database';
import { eventBus } from '../services/event-service';

const router = Router();

// Projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const project = await createProject(req.body);
    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/projects/:id', async (req, res) => {
  try {
    const deleted = await deleteProject(parseInt(req.params.id, 10));
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tasks
router.get('/tasks', async (req, res) => {
  try {
    const { status, project_id } = req.query;
    const tasks = await getTasks(
      status as string | undefined,
      project_id ? parseInt(project_id as string, 10) : undefined
    );
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await getTaskById(parseInt(req.params.id, 10));
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const task = await createTask(req.body);
    
    // Publish Event
    eventBus.publish('TASK_CREATED', task).catch(err => console.error('Failed to publish event:', err));

    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const task = await updateTask(parseInt(req.params.id, 10), req.body);
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const deleted = await deleteTask(parseInt(req.params.id, 10));
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Gamification
router.get('/stats', async (req, res) => {
  try {
    const stats = await getUserStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/achievements', async (req, res) => {
  try {
    const achievements = await getAchievements();
    res.json(achievements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
