-- DeepKit Agent Core - Database Schema
-- For use with DeepKit Postgres (deepkit_brain database)
-- THE VAULT (:5432)

-- Connect to deepkit_brain database
\c deepkit_brain

-- ==============================================
-- Agent Contexts
-- Projects, clients, teams that tasks/notes belong to
-- ==============================================
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

COMMENT ON TABLE agent_contexts IS 'Contexts for routing and organization (projects, clients, teams)';
COMMENT ON COLUMN agent_contexts.business_id IS 'Business identifier for multi-business routing';
COMMENT ON COLUMN agent_contexts.keywords IS 'Keywords for context matching/routing';
COMMENT ON COLUMN agent_contexts.patterns IS 'Regex patterns for advanced routing';
COMMENT ON COLUMN agent_contexts.routing_config IS 'Custom routing configuration (thresholds, weights)';

-- ==============================================
-- Agent Tasks
-- Tasks created by the agent or assigned to contexts
-- ==============================================
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID REFERENCES agent_contexts(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked')),
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE agent_tasks IS 'Tasks created by the agent';
COMMENT ON COLUMN agent_tasks.metadata IS 'Additional task data (source message, channel, etc.)';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_tasks_context ON agent_tasks(context_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_priority ON agent_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_due_date ON agent_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks(created_at DESC);

-- ==============================================
-- Agent Notes
-- Content analysis results, extracted information
-- ==============================================
CREATE TABLE IF NOT EXISTS agent_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID REFERENCES agent_contexts(id) ON DELETE SET NULL,
    title VARCHAR(500),
    content TEXT NOT NULL,
    source VARCHAR(1000),
    content_type VARCHAR(100),
    summary TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE agent_notes IS 'Notes from content analysis (YouTube, GitHub, articles, etc.)';
COMMENT ON COLUMN agent_notes.source IS 'URL or reference to source content';
COMMENT ON COLUMN agent_notes.content_type IS 'Type of source (youtube, github, article, etc.)';
COMMENT ON COLUMN agent_notes.summary IS 'AI-generated summary of content';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_notes_context ON agent_notes(context_id);
CREATE INDEX IF NOT EXISTS idx_agent_notes_content_type ON agent_notes(content_type);
CREATE INDEX IF NOT EXISTS idx_agent_notes_created_at ON agent_notes(created_at DESC);

-- Full-text search on notes
CREATE INDEX IF NOT EXISTS idx_agent_notes_content_fts
    ON agent_notes USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || content));

-- ==============================================
-- Agent Transactions
-- Audit trail of all agent actions
-- ==============================================
CREATE TABLE IF NOT EXISTS agent_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    channel VARCHAR(100),
    details JSONB,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE agent_transactions IS 'Audit trail of agent actions';
COMMENT ON COLUMN agent_transactions.transaction_type IS 'Category of action (message_received, tool_executed, task_created, etc.)';
COMMENT ON COLUMN agent_transactions.channel IS 'Channel where action originated (whatsapp, cli, slack, etc.)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_transactions_type ON agent_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_user ON agent_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_channel ON agent_transactions(channel);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_created_at ON agent_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_status ON agent_transactions(status);

-- ==============================================
-- Agent Conversations
-- Conversation history for context
-- ==============================================
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    channel VARCHAR(100) NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]',
    summary TEXT,
    context_id UUID REFERENCES agent_contexts(id) ON DELETE SET NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE agent_conversations IS 'Conversation history for maintaining context';
COMMENT ON COLUMN agent_conversations.messages IS 'Array of {role, content, timestamp} objects';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_channel ON agent_conversations(channel);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_last_activity ON agent_conversations(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_agent_contexts_business ON agent_contexts(business_id);

-- Unique constraint for user+channel combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_conversations_user_channel
    ON agent_conversations(user_id, channel);

-- ==============================================
-- Trigger for updated_at
-- ==============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_agent_contexts_updated_at ON agent_contexts;
CREATE TRIGGER update_agent_contexts_updated_at
    BEFORE UPDATE ON agent_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_tasks_updated_at ON agent_tasks;
CREATE TRIGGER update_agent_tasks_updated_at
    BEFORE UPDATE ON agent_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- Business Contexts (7 Businesses + General)
-- ==============================================
INSERT INTO agent_contexts (name, description, business_id, keywords, patterns)
VALUES
    ('LakeB2B', 'B2B lead generation and data solutions', 'lakeb2b', ARRAY['lead', 'b2b', 'data', 'email', 'contact', 'database'], ARRAY['lake\s*b2b', 'lead\s+gen']),
    ('Ampliz', 'Sales intelligence and prospecting platform', 'ampliz', ARRAY['sales', 'prospect', 'intelligence', 'account', 'intent'], ARRAY['ampliz', 'sales\s+intel']),
    ('Champions Accelerator', 'Startup accelerator and venture capital', 'champions_accelerator', ARRAY['startup', 'funding', 'accelerator', 'pitch', 'venture', 'founders'], ARRAY['accelerat', 'startup', 'fundrais']),
    ('Champions Group', 'Business services and consulting', 'champions_group', ARRAY['consulting', 'services', 'strategy', 'operations'], ARRAY['champion\s+group', 'consult']),
    ('RecruitChamp', 'Recruitment and talent acquisition', 'recruitchamp', ARRAY['recruit', 'hiring', 'talent', 'candidates', 'hr'], ARRAY['recruit', 'hiring', 'talent']),
    ('MetricFox', 'Analytics and performance tracking', 'metricfox', ARRAY['analytics', 'metrics', 'dashboard', 'reporting', 'insights'], ARRAY['metric', 'analytics', 'track']),
    ('IP Momentum', 'Intellectual property and innovation', 'ip_momentum', ARRAY['patent', 'trademark', 'ip', 'innovation', 'licensing'], ARRAY['ip\s+', 'patent', 'trademark']),
    ('General', 'Default context for unclassified content', 'general', ARRAY['general', 'misc', 'other'], ARRAY[]::TEXT[])
ON CONFLICT (name) DO NOTHING;

-- ==============================================
-- Permissions (if running as separate user)
-- ==============================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO deepkit;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO deepkit;

-- ==============================================
-- Verify tables created
-- ==============================================
SELECT
    'Tables created: ' || count(*)::text as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'agent_%';
