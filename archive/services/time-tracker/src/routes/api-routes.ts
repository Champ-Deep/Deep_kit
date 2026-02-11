import { Router, Request, Response } from 'express';
import Papa from 'papaparse';
import * as db from '../services/database';
import type { CreateProjectRequest, CreateTimeEntryRequest, StartTimerRequest } from '../types';

const router = Router();

// Projects
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await db.getProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/projects', async (req: Request, res: Response) => {
  try {
    const projectData: CreateProjectRequest = req.body;

    if (!projectData.name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const project = await db.createProject(projectData);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await db.deleteProject(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Time Entries
router.get('/time-entries', async (req: Request, res: Response) => {
  try {
    const { start, end, project_id } = req.query;
    const entries = await db.getTimeEntries(
      start as string | undefined,
      end as string | undefined,
      project_id ? parseInt(project_id as string, 10) : undefined
    );
    res.json(entries);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

router.post('/time-entries', async (req: Request, res: Response) => {
  try {
    const entryData: CreateTimeEntryRequest = req.body;

    if (!entryData.start_time) {
      return res.status(400).json({ error: 'Missing required field: start_time' });
    }

    const entry = await db.createTimeEntry(entryData);
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating time entry:', error);
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

router.put('/time-entries/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const entryData: Partial<CreateTimeEntryRequest> = req.body;
    const entry = await db.updateTimeEntry(id, entryData);
    if (!entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    res.json(entry);
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

router.delete('/time-entries/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await db.deleteTimeEntry(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

// Timers
router.get('/timers/active', async (req: Request, res: Response) => {
  try {
    const timer = await db.getActiveTimer();
    res.json(timer);
  } catch (error) {
    console.error('Error fetching active timer:', error);
    res.status(500).json({ error: 'Failed to fetch active timer' });
  }
});

router.post('/timers/start', async (req: Request, res: Response) => {
  try {
    const timerData: StartTimerRequest = req.body;
    const timer = await db.startTimer(timerData);
    res.status(201).json(timer);
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: 'Failed to start timer' });
  }
});

router.post('/timers/stop', async (req: Request, res: Response) => {
  try {
    const timeEntry = await db.stopTimer();
    if (!timeEntry) {
      return res.status(404).json({ error: 'No active timer found' });
    }
    res.json(timeEntry);
  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({ error: 'Failed to stop timer' });
  }
});

// Reports
router.get('/reports/summary', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const summary = await db.getSummary(
      start as string | undefined,
      end as string | undefined
    );
    res.json(summary);
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

router.get('/reports/export', async (req: Request, res: Response) => {
  try {
    const { start, end, project_id } = req.query;
    const entries = await db.getTimeEntries(
      start as string | undefined,
      end as string | undefined,
      project_id ? parseInt(project_id as string, 10) : undefined
    );

    const csvData = entries.map(entry => ({
      ID: entry.id,
      'Project ID': entry.project_id || '',
      'Task ID': entry.task_id || '',
      Description: entry.description || '',
      'Start Time': entry.start_time,
      'End Time': entry.end_time || '',
      'Duration (seconds)': entry.duration_seconds || '',
      'Duration (formatted)': entry.duration_seconds ? formatDuration(entry.duration_seconds) : '',
      Billable: entry.is_billable ? 'Yes' : 'No',
      'Hourly Rate': entry.hourly_rate || '',
      'Total Amount': entry.total_amount || '',
      'Created At': entry.created_at
    }));

    const csv = Papa.unparse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="time-entries.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

export default router;
