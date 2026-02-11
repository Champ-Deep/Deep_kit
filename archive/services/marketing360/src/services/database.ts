import { Pool } from 'pg';
import type {
  Contact,
  Campaign,
  SocialPost,
  CustomerInteraction,
  EmailTemplate,
  CreateContactRequest,
  CreateCampaignRequest,
  CreateSocialPostRequest
} from '../types';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        phone VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        tags TEXT,
        source VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        subject VARCHAR(500),
        content TEXT NOT NULL,
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS social_posts (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        media_url TEXT,
        status VARCHAR(20) DEFAULT 'draft',
        scheduled_at TIMESTAMP,
        published_at TIMESTAMP,
        external_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customer_interactions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES contacts(id),
        channel VARCHAR(20) NOT NULL,
        interaction_type VARCHAR(50),
        content TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        variables TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
      CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
      CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);
      CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
      CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
      CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer ON customer_interactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_customer_interactions_channel ON customer_interactions(channel);
    `);
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Contacts
export async function getContacts(search?: string): Promise<Contact[]> {
  let query = 'SELECT * FROM contacts';
  const params: string[] = [];

  if (search) {
    query += ' WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function createContact(contact: CreateContactRequest): Promise<Contact> {
  const result = await pool.query(
    'INSERT INTO contacts (email, phone, name, tags, source) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [contact.email || null, contact.phone || null, contact.name, contact.tags || null, contact.source || null]
  );
  return result.rows[0];
}

export async function deleteContact(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM contacts WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Campaigns
export async function getCampaigns(type?: string, status?: string): Promise<Campaign[]> {
  let query = 'SELECT * FROM campaigns WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (type) {
    query += ` AND type = $${paramIndex++}`;
    params.push(type);
  }

  if (status) {
    query += ` AND status = $${paramIndex++}`;
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function createCampaign(campaign: CreateCampaignRequest): Promise<Campaign> {
  const result = await pool.query(
    `INSERT INTO campaigns (name, type, subject, content, scheduled_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [campaign.name, campaign.type, campaign.subject || null, campaign.content, campaign.scheduled_at || null]
  );
  return result.rows[0];
}

export async function updateCampaignStatus(id: number, status: string): Promise<Campaign | null> {
  const result = await pool.query(
    'UPDATE campaigns SET status = $1, sent_at = CASE WHEN $1 = \'sent\' THEN NOW() ELSE sent_at END WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0] || null;
}

export async function deleteCampaign(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Social Posts
export async function getSocialPosts(platform?: string): Promise<SocialPost[]> {
  let query = 'SELECT * FROM social_posts';
  const params: string[] = [];

  if (platform) {
    query += ' WHERE platform = $1';
    params.push(platform);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function createSocialPost(post: CreateSocialPostRequest): Promise<SocialPost> {
  const result = await pool.query(
    'INSERT INTO social_posts (platform, content, media_url, scheduled_at) VALUES ($1, $2, $3, $4) RETURNING *',
    [post.platform, post.content, post.media_url || null, post.scheduled_at || null]
  );
  return result.rows[0];
}

export async function updateSocialPostStatus(id: number, status: string, externalId?: string): Promise<SocialPost | null> {
  const result = await pool.query(
    `UPDATE social_posts
     SET status = $1, external_id = $2, published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END
     WHERE id = $3
     RETURNING *`,
    [status, externalId || null, id]
  );
  return result.rows[0] || null;
}

export async function deleteSocialPost(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM social_posts WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Customer Interactions (360° Tracking)
export async function getCustomerInteractions(customerId: number): Promise<CustomerInteraction[]> {
  const result = await pool.query(
    'SELECT * FROM customer_interactions WHERE customer_id = $1 ORDER BY created_at DESC',
    [customerId]
  );
  return result.rows;
}

export async function trackInteraction(
  customerId: number,
  channel: string,
  interactionType: string,
  content?: string,
  metadata?: any
): Promise<CustomerInteraction> {
  const result = await pool.query(
    'INSERT INTO customer_interactions (customer_id, channel, interaction_type, content, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [customerId, channel, interactionType, content || null, metadata || null]
  );
  return result.rows[0];
}

// Email Templates
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const result = await pool.query('SELECT * FROM email_templates ORDER BY name ASC');
  return result.rows;
}

export async function createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'created_at'>): Promise<EmailTemplate> {
  const result = await pool.query(
    'INSERT INTO email_templates (name, subject, body, variables) VALUES ($1, $2, $3, $4) RETURNING *',
    [template.name, template.subject, template.body, template.variables || null]
  );
  return result.rows[0];
}

// Stats
export async function getStats() {
  const [contacts, campaigns, posts, recentInteractions] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM contacts'),
    pool.query('SELECT COUNT(*) FROM campaigns WHERE status = $1', ['sent']),
    pool.query('SELECT COUNT(*) FROM social_posts WHERE status = $1', ['published']),
    pool.query('SELECT COUNT(*) FROM customer_interactions WHERE created_at >= NOW() - INTERVAL \'7 days\'')
  ]);

  return {
    totalContacts: parseInt(contacts.rows[0].count, 10),
    campaignsSent: parseInt(campaigns.rows[0].count, 10),
    postsPublished: parseInt(posts.rows[0].count, 10),
    interactionsThisWeek: parseInt(recentInteractions.rows[0].count, 10)
  };
}

export { pool };
