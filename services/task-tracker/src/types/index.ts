export interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  project_id: number | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  points: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface UserStats {
  id: number;
  total_points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  tasks_completed: number;
  last_completion_date: string | null;
  created_at: string;
}

export interface Achievement {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  condition: any;
  unlocked_at: string | null;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  project_id?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  project_id?: number;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
}
