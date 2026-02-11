const { Pool } = require('pg');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * DeepKitStorage - Storage implementation for DeepKit Postgres (deepkit_brain)
 *
 * Connects to the existing DeepKit Postgres instance and uses agent-specific tables:
 * - agent_contexts: Project/client contexts for routing (includes business_id)
 * - agent_tasks: Tasks created by the agent
 * - agent_notes: Notes from content analysis
 * - agent_transactions: Audit trail of actions
 * - agent_conversations: Conversation history for context
 */
class DeepKitStorage {
  constructor(config = {}) {
    this.type = 'deepkit-postgres';

    // DeepKit Postgres connection (from Docker network)
    this.pool = new Pool({
      host: config.host || process.env.DEEPKIT_POSTGRES_HOST || 'postgres',
      port: config.port || process.env.DEEPKIT_POSTGRES_PORT || 5432,
      database: config.database || process.env.DEEPKIT_POSTGRES_DB || 'deepkit_brain',
      user: config.user || process.env.DEEPKIT_POSTGRES_USER || 'deepkit',
      password: config.password || process.env.DEEPKIT_POSTGRES_PASSWORD,
      max: config.maxConnections || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('DeepKit Postgres pool error:', err.message);
    });

    logger.info('DeepKitStorage initialized', {
      host: config.host || process.env.DEEPKIT_POSTGRES_HOST || 'postgres',
      database: config.database || process.env.DEEPKIT_POSTGRES_DB || 'deepkit_brain'
    });
  }

  /**
   * Initialize database tables if they don't exist
   */
  async initialize() {
    const client = await this.pool.connect();
    try {
      // Create tables with business routing support
      await client.query(`
        -- Agent contexts (projects, clients, etc.) with business_id
        CREATE TABLE IF NOT EXISTS agent_contexts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          business_id VARCHAR(100),
          keywords TEXT[],
          patterns TEXT[],
          routing_config JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Agent tasks
        CREATE TABLE IF NOT EXISTS agent_tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          context_id UUID REFERENCES agent_contexts(id),
          title VARCHAR(500) NOT NULL,
          description TEXT,
          priority VARCHAR(50) DEFAULT 'medium',
          status VARCHAR(50) DEFAULT 'pending',
          due_date TIMESTAMP WITH TIME ZONE,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Agent notes (from content analysis)
        CREATE TABLE IF NOT EXISTS agent_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          context_id UUID REFERENCES agent_contexts(id),
          title VARCHAR(500),
          content TEXT,
          source VARCHAR(1000),
          content_type VARCHAR(100),
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Agent transactions (audit trail)
        CREATE TABLE IF NOT EXISTS agent_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          transaction_type VARCHAR(100),
          action VARCHAR(255),
          user_id VARCHAR(255),
          channel VARCHAR(100),
          details JSONB,
          status VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Agent conversations (multi-turn context)
        CREATE TABLE IF NOT EXISTS agent_conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          channel VARCHAR(100) NOT NULL,
          messages JSONB NOT NULL DEFAULT '[]',
          summary TEXT,
          context_id UUID REFERENCES agent_contexts(id),
          last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_agent_tasks_context ON agent_tasks(context_id);
        CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
        CREATE INDEX IF NOT EXISTS idx_agent_notes_context ON agent_notes(context_id);
        CREATE INDEX IF NOT EXISTS idx_agent_transactions_type ON agent_transactions(transaction_type);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_user ON agent_conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_channel ON agent_conversations(channel);
        CREATE INDEX IF NOT EXISTS idx_agent_contexts_business ON agent_contexts(business_id);

        -- Agent workflows (n8n workflow metadata)
        CREATE TABLE IF NOT EXISTS agent_workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          n8n_id VARCHAR(100) NOT NULL,
          name VARCHAR(500) NOT NULL,
          template VARCHAR(100),
          active BOOLEAN DEFAULT true,
          webhook_path VARCHAR(500),
          description TEXT,
          user_id VARCHAR(255),
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_workflows_n8n_id ON agent_workflows(n8n_id);
        CREATE INDEX IF NOT EXISTS idx_agent_workflows_user ON agent_workflows(user_id);
        CREATE INDEX IF NOT EXISTS idx_agent_workflows_name ON agent_workflows(name);

        -- Unique constraint for user+channel combination
        CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_conversations_user_channel
          ON agent_conversations(user_id, channel);
      `);

      logger.info('DeepKitStorage tables initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Create a task in the specified context
   */
  async createTask(contextId, task) {
    const sql = `
      INSERT INTO agent_tasks (context_id, title, description, priority, status, due_date, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await this.pool.query(sql, [
      contextId,
      task.title,
      task.description || null,
      task.priority || 'medium',
      task.status || 'pending',
      task.dueDate || null,
      task.metadata ? JSON.stringify(task.metadata) : null
    ]);

    logger.info('Task created', { taskId: result.rows[0].id, title: task.title });
    return result.rows[0];
  }

  /**
   * Create a note in the specified context
   */
  async createNote(contextId, note) {
    const sql = `
      INSERT INTO agent_notes (context_id, title, content, source, content_type, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.pool.query(sql, [
      contextId,
      note.title || null,
      note.content,
      note.source || null,
      note.contentType || null,
      note.metadata ? JSON.stringify(note.metadata) : null
    ]);

    logger.info('Note created', { noteId: result.rows[0].id, title: note.title });
    return result.rows[0];
  }

  /**
   * Query data from the storage
   */
  async query(contextId, queryParams) {
    const { type = 'all', filters = {}, limit = 50, offset = 0 } = queryParams;
    const results = { tasks: [], notes: [] };

    if (type === 'tasks' || type === 'all') {
      let taskSql = 'SELECT * FROM agent_tasks WHERE 1=1';
      const taskParams = [];
      let paramIndex = 1;

      if (contextId) {
        taskSql += ` AND context_id = $${paramIndex++}`;
        taskParams.push(contextId);
      }
      if (filters.status) {
        taskSql += ` AND status = $${paramIndex++}`;
        taskParams.push(filters.status);
      }
      if (filters.priority) {
        taskSql += ` AND priority = $${paramIndex++}`;
        taskParams.push(filters.priority);
      }

      taskSql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      taskParams.push(limit, offset);

      const taskResult = await this.pool.query(taskSql, taskParams);
      results.tasks = taskResult.rows;
    }

    if (type === 'notes' || type === 'all') {
      let noteSql = 'SELECT * FROM agent_notes WHERE 1=1';
      const noteParams = [];
      let paramIndex = 1;

      if (contextId) {
        noteSql += ` AND context_id = $${paramIndex++}`;
        noteParams.push(contextId);
      }
      if (filters.contentType) {
        noteSql += ` AND content_type = $${paramIndex++}`;
        noteParams.push(filters.contentType);
      }

      noteSql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      noteParams.push(limit, offset);

      const noteResult = await this.pool.query(noteSql, noteParams);
      results.notes = noteResult.rows;
    }

    return results;
  }

  /**
   * Update an existing task
   */
  async updateTask(contextId, taskId, updates) {
    const allowedFields = ['title', 'description', 'priority', 'status', 'due_date', 'metadata'];
    const setFields = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key === 'dueDate' ? 'due_date' : key;
      if (allowedFields.includes(dbKey)) {
        setFields.push(`${dbKey} = $${paramIndex++}`);
        params.push(key === 'metadata' ? JSON.stringify(value) : value);
      }
    }

    if (setFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    setFields.push(`updated_at = NOW()`);
    params.push(taskId);

    const sql = `
      UPDATE agent_tasks
      SET ${setFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(sql, params);
    if (result.rows.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    logger.info('Task updated', { taskId });
    return result.rows[0];
  }

  /**
   * Delete a task
   */
  async deleteTask(contextId, taskId) {
    const result = await this.pool.query(
      'DELETE FROM agent_tasks WHERE id = $1 RETURNING id',
      [taskId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    logger.info('Task deleted', { taskId });
    return true;
  }

  /**
   * Log a transaction (audit trail)
   */
  async logTransaction(transaction) {
    const sql = `
      INSERT INTO agent_transactions (transaction_type, action, user_id, channel, details, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.pool.query(sql, [
      transaction.type || 'unknown',
      transaction.action,
      transaction.userId || null,
      transaction.channel || null,
      transaction.details ? JSON.stringify(transaction.details) : null,
      transaction.status || 'completed'
    ]);

    return result.rows[0];
  }

  /**
   * Get all contexts
   */
  async getContexts() {
    const result = await this.pool.query(
      'SELECT * FROM agent_contexts ORDER BY name'
    );
    return result.rows;
  }

  /**
   * Get context by business_id (for business routing)
   */
  async getContextByBusinessId(businessId) {
    const result = await this.pool.query(
      'SELECT * FROM agent_contexts WHERE business_id = $1',
      [businessId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get context by name
   */
  async getContextByName(name) {
    const result = await this.pool.query(
      'SELECT * FROM agent_contexts WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new context
   */
  async createContext(contextData) {
    const sql = `
      INSERT INTO agent_contexts (name, description, business_id, keywords, patterns, routing_config)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.pool.query(sql, [
      contextData.name,
      contextData.description || null,
      contextData.businessId || null,
      contextData.keywords || [],
      contextData.patterns || [],
      contextData.routingConfig ? JSON.stringify(contextData.routingConfig) : null
    ]);

    logger.info('Context created', { contextId: result.rows[0].id, name: contextData.name });
    return result.rows[0];
  }

  /**
   * Get context by ID
   */
  async getContext(contextId) {
    const result = await this.pool.query(
      'SELECT * FROM agent_contexts WHERE id = $1',
      [contextId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get or create conversation for user+channel
   */
  async getConversation(userId, channel) {
    const result = await this.pool.query(
      'SELECT * FROM agent_conversations WHERE user_id = $1 AND channel = $2',
      [userId, channel]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create new conversation
    const createResult = await this.pool.query(
      `INSERT INTO agent_conversations (user_id, channel, messages)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, channel, JSON.stringify([])]
    );

    return createResult.rows[0];
  }

  /**
   * Update conversation messages
   */
  async updateConversation(conversationId, messages, contextId = null) {
    const sql = `
      UPDATE agent_conversations
      SET messages = $1, last_activity = NOW(), context_id = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await this.pool.query(sql, [
      JSON.stringify(messages),
      contextId,
      conversationId
    ]);

    return result.rows[0];
  }

  // --- Workflow Storage Methods ---

  /**
   * Save a workflow's metadata to Postgres
   */
  async saveWorkflow(workflow) {
    const sql = `
      INSERT INTO agent_workflows (n8n_id, name, template, active, webhook_path, description, user_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (n8n_id) DO UPDATE SET
        name = EXCLUDED.name,
        active = EXCLUDED.active,
        webhook_path = EXCLUDED.webhook_path,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await this.pool.query(sql, [
      workflow.n8nId,
      workflow.name,
      workflow.template || null,
      workflow.active !== false,
      workflow.webhookPath || null,
      workflow.description || null,
      workflow.userId || null,
      workflow.metadata ? JSON.stringify(workflow.metadata) : null
    ]);

    logger.info('Workflow saved', { n8nId: workflow.n8nId, name: workflow.name });
    return result.rows[0];
  }

  /**
   * List all stored workflows
   */
  async listWorkflows(userId = null) {
    let sql = 'SELECT * FROM agent_workflows';
    const params = [];

    if (userId) {
      sql += ' WHERE user_id = $1';
      params.push(userId);
    }

    sql += ' ORDER BY created_at DESC';
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Get a workflow by n8n ID
   */
  async getWorkflowByN8nId(n8nId) {
    const result = await this.pool.query(
      'SELECT * FROM agent_workflows WHERE n8n_id = $1',
      [n8nId]
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a workflow record
   */
  async deleteWorkflow(n8nId) {
    const result = await this.pool.query(
      'DELETE FROM agent_workflows WHERE n8n_id = $1 RETURNING *',
      [n8nId]
    );
    return result.rows[0] || null;
  }

  /**
   * Test connection to the database
   */
  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW()');
      return true;
    } catch (error) {
      logger.error('DeepKit Postgres connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get storage health status
   */
  async getHealth() {
    try {
      const connected = await this.testConnection();

      // Get table counts
      const stats = await this.pool.query(`
        SELECT
          (SELECT COUNT(*) FROM agent_contexts) as context_count,
          (SELECT COUNT(*) FROM agent_tasks) as task_count,
          (SELECT COUNT(*) FROM agent_notes) as note_count,
          (SELECT COUNT(*) FROM agent_transactions) as transaction_count,
          (SELECT COUNT(*) FROM agent_conversations) as conversation_count,
          (SELECT COUNT(*) FROM agent_workflows) as workflow_count
      `);

      return {
        type: this.type,
        connected,
        status: connected ? 'healthy' : 'unhealthy',
        database: process.env.DEEPKIT_POSTGRES_DB || 'deepkit_brain',
        stats: stats.rows[0],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        type: this.type,
        connected: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute raw SQL query (for advanced DeepKit integrations)
   */
  async rawQuery(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Close the connection pool
   */
  async close() {
    await this.pool.end();
    logger.info('DeepKitStorage connection closed');
  }
}

module.exports = { DeepKitStorage };
