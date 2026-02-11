-- ============================================================================
-- TASK TRACKER MIGRATION: Multi-User Support & Recurring Tasks
-- Version: 001
-- Date: 2026-01-31
-- ============================================================================
-- This migration adds:
--   1. Users table with authentication
--   2. user_id foreign keys to all core tables
--   3. Recurring task support with rrule
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create Users Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- STEP 2: Add user_id to existing tables
-- ============================================================================

-- Add user_id to projects (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        CREATE INDEX idx_projects_user ON projects(user_id);
    END IF;
END $$;

-- Add user_id to tasks (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        CREATE INDEX idx_tasks_user ON tasks(user_id);
    END IF;
END $$;

-- Rename user_stats to per-user format and add user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_stats' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE user_stats ADD COLUMN user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE;
        CREATE INDEX idx_user_stats_user ON user_stats(user_id);
    END IF;
END $$;

-- Add user_id to achievements (many-to-many relationship handled separately)
-- Create user_achievements junction table for many-to-many
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);

-- ============================================================================
-- STEP 3: Add recurring task fields to tasks table
-- ============================================================================

-- Add is_recurring flag
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'is_recurring'
    ) THEN
        ALTER TABLE tasks ADD COLUMN is_recurring BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add recurrence_rule (stores rrule string)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'recurrence_rule'
    ) THEN
        ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT;
    END IF;
END $$;

-- Add parent_task_id (links recurring instances to parent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'parent_task_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;
        CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
    END IF;
END $$;

-- Add instance_date (for recurring task instances)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'instance_date'
    ) THEN
        ALTER TABLE tasks ADD COLUMN instance_date DATE;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Create default admin user
-- ============================================================================

-- Insert default admin user (password: 'admin' hashed with bcrypt)
-- Password hash for 'admin' (10 rounds bcrypt): $2b$10$rKZKbV8M.Z5o8XQWqVJxQ.1YcM3xQU8Z7N6kJx5Z7N6kJx5Z7N6kJ
INSERT INTO users (username, email, password_hash, full_name)
VALUES (
    'admin',
    'admin@deepkit.local',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- bcrypt('admin')
    'DeepKit Administrator'
)
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- STEP 5: Migrate existing data to admin user
-- ============================================================================

-- Assign all existing projects to admin user
UPDATE projects
SET user_id = (SELECT id FROM users WHERE username = 'admin')
WHERE user_id IS NULL;

-- Assign all existing tasks to admin user
UPDATE tasks
SET user_id = (SELECT id FROM users WHERE username = 'admin')
WHERE user_id IS NULL;

-- Assign existing user_stats to admin user
UPDATE user_stats
SET user_id = (SELECT id FROM users WHERE username = 'admin')
WHERE user_id IS NULL AND id = 1;

-- Migrate existing achievements to user_achievements for admin
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT
    (SELECT id FROM users WHERE username = 'admin'),
    id,
    unlocked_at
FROM achievements
WHERE unlocked_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Remove unlocked_at from achievements table (now in user_achievements)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'achievements' AND column_name = 'unlocked_at'
    ) THEN
        ALTER TABLE achievements DROP COLUMN unlocked_at;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Make user_id NOT NULL after migration
-- ============================================================================

-- Make user_id NOT NULL in projects
DO $$
BEGIN
    ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
END $$;

-- Make user_id NOT NULL in tasks
DO $$
BEGIN
    ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
END $$;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify migration
SELECT
    'Migration Complete' as status,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM projects) as total_projects,
    (SELECT COUNT(*) FROM tasks) as total_tasks,
    (SELECT COUNT(*) FROM user_achievements) as total_unlocked_achievements;
