const axios = require('axios');

/**
 * task_tracker - Create, list, and update tasks in the DeepKit Arsenal
 *
 * Uses the local Postgres storage directly (no external HTTP service needed).
 * Supports: create, list, update operations on agent_tasks.
 */
module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'task_tracker',
      description: 'Manage tasks in the DeepKit Arsenal. Use this to create new tasks, list existing tasks, or update task status. Supports create, list, and update operations.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'list', 'update'],
            description: 'The operation to perform: create a new task, list existing tasks, or update a task'
          },
          title: {
            type: 'string',
            description: 'Task title (required for create)'
          },
          description: {
            type: 'string',
            description: 'Task description (optional, for create)'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Task priority (default: medium)'
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            description: 'Task status (for update or list filter)'
          },
          task_id: {
            type: 'string',
            description: 'Task ID (required for update)'
          },
          limit: {
            type: 'number',
            description: 'Max results for list (default: 10)'
          }
        },
        required: ['action']
      }
    }
  },

  /**
   * Execute the task tracker tool
   * @param {object} args - Tool arguments from LLM
   * @param {object} context - { storage, userId, channel }
   */
  execute: async (args, context) => {
    const { storage } = context;

    if (!storage) {
      return { success: false, error: 'Storage unavailable. THE VAULT is offline.' };
    }

    const { action } = args;

    switch (action) {
      case 'create': {
        if (!args.title) {
          return { success: false, error: 'Task title is required for create action.' };
        }

        // Ensure general context exists
        let ctx = await storage.getContextByName('general');
        if (!ctx) {
          ctx = await storage.createContext({
            name: 'general',
            description: 'General tasks',
            keywords: [],
            patterns: []
          });
        }

        const task = await storage.createTask(ctx.id, {
          title: args.title,
          description: args.description || '',
          priority: args.priority || 'medium',
          status: 'pending',
          metadata: {
            created_by: context.userId || 'unknown',
            source: context.channel || 'api',
            created_at: new Date().toISOString()
          }
        });

        return {
          success: true,
          action: 'created',
          task_id: task.id,
          title: task.title,
          priority: task.priority,
          status: task.status,
          message: `Task "${task.title}" created with ID ${task.id.substring(0, 8)}`
        };
      }

      case 'list': {
        let ctx = await storage.getContextByName('general');
        const contextId = ctx ? ctx.id : null;

        const filters = {};
        if (args.status) filters.status = args.status;
        if (args.priority) filters.priority = args.priority;

        const results = await storage.query(contextId, {
          type: 'tasks',
          filters,
          limit: args.limit || 10
        });

        const tasks = results.tasks || [];
        return {
          success: true,
          action: 'listed',
          count: tasks.length,
          tasks: tasks.map(t => ({
            id: t.id.substring(0, 8),
            title: t.title,
            priority: t.priority,
            status: t.status,
            created_at: t.created_at
          })),
          message: tasks.length > 0
            ? `Found ${tasks.length} task(s)`
            : 'No tasks found'
        };
      }

      case 'update': {
        if (!args.task_id) {
          return { success: false, error: 'task_id is required for update action.' };
        }

        const updates = {};
        if (args.status) updates.status = args.status;
        if (args.priority) updates.priority = args.priority;
        if (args.title) updates.title = args.title;
        if (args.description) updates.description = args.description;

        if (Object.keys(updates).length === 0) {
          return { success: false, error: 'No fields to update. Provide status, priority, title, or description.' };
        }

        // Try to find task with full or partial ID
        let taskId = args.task_id;

        // If it's a partial ID, try to find the full one
        if (taskId.length < 36) {
          const searchResult = await storage.rawQuery(
            'SELECT id FROM agent_tasks WHERE id::text LIKE $1 LIMIT 1',
            [`${taskId}%`]
          );
          if (searchResult.length > 0) {
            taskId = searchResult[0].id;
          } else {
            return { success: false, error: `No task found with ID starting with "${args.task_id}"` };
          }
        }

        const updated = await storage.updateTask(null, taskId, updates);
        return {
          success: true,
          action: 'updated',
          task_id: updated.id.substring(0, 8),
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
          message: `Task "${updated.title}" updated`
        };
      }

      default:
        return { success: false, error: `Unknown action: ${action}. Use create, list, or update.` };
    }
  }
};
