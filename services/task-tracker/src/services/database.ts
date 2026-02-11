import { Pool } from 'pg';
import dayjs from 'dayjs';
import type { Project, Task, UserStats, Achievement, CreateProjectRequest, CreateTaskRequest, UpdateTaskRequest } from '../types';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

if (!process.env.POSTGRES_PASSWORD) {
  console.error('❌ POSTGRES_PASSWORD environment variable is required');
  // In some contexts we might want to exit, but for now let's just log
}

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7),
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'todo',
        priority VARCHAR(20) DEFAULT 'medium',
        points INTEGER DEFAULT 1,
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_stats (
        id SERIAL PRIMARY KEY,
        total_points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        tasks_completed INTEGER DEFAULT 0,
        last_completion_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        condition JSONB,
        unlocked_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

      -- Initialize default user stats if not exists
      INSERT INTO user_stats (id, total_points, level, current_streak, longest_streak, tasks_completed)
      SELECT 1, 0, 1, 0, 0, 0
      WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE id = 1);

      -- Initialize default achievements
      INSERT INTO achievements (name, description, icon, condition, unlocked_at)
      VALUES
        ('First Task', 'Complete your first task', '🎯', '{"type": "tasks_completed", "value": 1}', NULL),
        ('Getting Started', 'Complete 10 tasks', '⭐', '{"type": "tasks_completed", "value": 10}', NULL),
        ('Productivity Pro', 'Complete 50 tasks', '🏆', '{"type": "tasks_completed", "value": 50}', NULL),
        ('On Fire', 'Maintain a 7-day streak', '🔥', '{"type": "streak", "value": 7}', NULL),
        ('Level Up', 'Reach level 5', '📈', '{"type": "level", "value": 5}', NULL),
        ('Point Master', 'Earn 1000 points', '💎', '{"type": "points", "value": 1000}', NULL)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Projects
export async function getProjects(): Promise<Project[]> {
  const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
  return result.rows;
}

export async function createProject(project: CreateProjectRequest): Promise<Project> {
  const result = await pool.query(
    'INSERT INTO projects (name, description, color, icon) VALUES ($1, $2, $3, $4) RETURNING *',
    [project.name, project.description || null, project.color || null, project.icon || null]
  );
  return result.rows[0];
}

export async function deleteProject(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Tasks
export async function getTasks(status?: string, projectId?: number): Promise<Task[]> {
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND status = $${paramIndex++}`;
    params.push(status);
  }

  if (projectId !== undefined) {
    query += ` AND project_id = $${paramIndex++}`;
    params.push(projectId);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getTaskById(id: number): Promise<Task | null> {
  const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createTask(task: CreateTaskRequest): Promise<Task> {
  // Calculate points based on priority
  const pointsMap = { low: 1, medium: 2, high: 3, urgent: 5 };
  const points = pointsMap[task.priority || 'medium'];

  const result = await pool.query(
    `INSERT INTO tasks (title, description, project_id, priority, points, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      task.title,
      task.description || null,
      task.project_id || null,
      task.priority || 'medium',
      points,
      task.due_date || null
    ]
  );
  return result.rows[0];
}

export async function updateTask(id: number, updates: UpdateTaskRequest): Promise<Task | null> {
  const task = await getTaskById(id);
  if (!task) return null;

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.project_id !== undefined) {
    fields.push(`project_id = $${paramIndex++}`);
    values.push(updates.project_id);
  }
  if (updates.priority !== undefined) {
    fields.push(`priority = $${paramIndex++}`);
    values.push(updates.priority);
    // Recalculate points
    const pointsMap = { low: 1, medium: 2, high: 3, urgent: 5 };
    fields.push(`points = $${paramIndex++}`);
    values.push(pointsMap[updates.priority]);
  }
  if (updates.due_date !== undefined) {
    fields.push(`due_date = $${paramIndex++}`);
    values.push(updates.due_date);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);

    // If completing task, update gamification
    if (updates.status === 'done' && task.status !== 'done') {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(new Date());
      await updateUserStatsOnComplete(task.points);
    }
  }

  if (fields.length === 0) return task;

  values.push(id);
  const result = await pool.query(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteTask(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// User Stats and Gamification
export async function getUserStats(): Promise<UserStats> {
  const result = await pool.query('SELECT * FROM user_stats WHERE id = 1');
  return result.rows[0];
}

async function updateUserStatsOnComplete(points: number): Promise<void> {
  const stats = await getUserStats();
  const today = dayjs().format('YYYY-MM-DD');
  const lastDate = stats.last_completion_date ? dayjs(stats.last_completion_date).format('YYYY-MM-DD') : null;

  let newStreak = stats.current_streak;
  if (lastDate === today) {
    // Same day, no streak change
  } else if (lastDate === dayjs().subtract(1, 'day').format('YYYY-MM-DD')) {
    // Previous day, increment streak
    newStreak += 1;
  } else {
    // Streak broken, reset to 1
    newStreak = 1;
  }

  const newPoints = stats.total_points + points;
  const newLevel = Math.floor(newPoints / 100) + 1; // Level up every 100 points
  const newTasksCompleted = stats.tasks_completed + 1;
  const newLongestStreak = Math.max(newStreak, stats.longest_streak);

  await pool.query(
    `UPDATE user_stats
     SET total_points = $1, level = $2, current_streak = $3, longest_streak = $4,
         tasks_completed = $5, last_completion_date = $6
     WHERE id = 1`,
    [newPoints, newLevel, newStreak, newLongestStreak, newTasksCompleted, today]
  );

  // Check and unlock achievements
  await checkAchievements(newTasksCompleted, newStreak, newLevel, newPoints);
}

async function checkAchievements(tasksCompleted: number, streak: number, level: number, points: number): Promise<void> {
  const achievements = await pool.query('SELECT * FROM achievements WHERE unlocked_at IS NULL');

  for (const achievement of achievements.rows) {
    const condition = achievement.condition;
    let shouldUnlock = false;

    if (condition.type === 'tasks_completed' && tasksCompleted >= condition.value) {
      shouldUnlock = true;
    } else if (condition.type === 'streak' && streak >= condition.value) {
      shouldUnlock = true;
    } else if (condition.type === 'level' && level >= condition.value) {
      shouldUnlock = true;
    } else if (condition.type === 'points' && points >= condition.value) {
      shouldUnlock = true;
    }

    if (shouldUnlock) {
      await pool.query('UPDATE achievements SET unlocked_at = NOW() WHERE id = $1', [achievement.id]);
    }
  }
}

export async function getAchievements(): Promise<Achievement[]> {
  const result = await pool.query('SELECT * FROM achievements ORDER BY id ASC');
  return result.rows;
}

// Stats
export async function getStats() {
  const stats = await getUserStats();
  const todoCount = await pool.query('SELECT COUNT(*) FROM tasks WHERE status = $1', ['todo']);
  const inProgressCount = await pool.query('SELECT COUNT(*) FROM tasks WHERE status = $1', ['in_progress']);
  const completedToday = await pool.query(
    'SELECT COUNT(*) FROM tasks WHERE status = $1 AND completed_at::date = CURRENT_DATE',
    ['done']
  );

  return {
    level: stats.level,
    points: stats.total_points,
    streak: `${stats.current_streak} days`,
    todoTasks: parseInt(todoCount.rows[0].count, 10),
    inProgress: parseInt(inProgressCount.rows[0].count, 10),
    completedToday: parseInt(completedToday.rows[0].count, 10)
  };
}

export { pool };
