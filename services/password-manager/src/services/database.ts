import { Pool } from 'pg';
import crypto from 'crypto';
import type { Vault, Password, PasswordDecrypted, CreateVaultRequest, CreatePasswordRequest, UpdatePasswordRequest } from '../types';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Encryption key from environment (should be 32 bytes hex)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
const ALGORITHM = 'aes-256-gcm';

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS vaults (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS passwords (
        id SERIAL PRIMARY KEY,
        vault_id INTEGER REFERENCES vaults(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        username VARCHAR(255),
        password_encrypted TEXT NOT NULL,
        url TEXT,
        notes_encrypted TEXT,
        tags TEXT,
        favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_passwords_vault ON passwords(vault_id);
      CREATE INDEX IF NOT EXISTS idx_passwords_favorite ON passwords(favorite);
    `);
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Encryption utilities
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Vaults
export async function getVaults(): Promise<Vault[]> {
  const result = await pool.query('SELECT * FROM vaults ORDER BY name ASC');
  return result.rows;
}

export async function createVault(vault: CreateVaultRequest): Promise<Vault> {
  const result = await pool.query(
    'INSERT INTO vaults (name, description, icon) VALUES ($1, $2, $3) RETURNING *',
    [vault.name, vault.description || null, vault.icon || null]
  );
  return result.rows[0];
}

export async function deleteVault(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM vaults WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Passwords
export async function getPasswords(vaultId?: number, search?: string): Promise<Password[]> {
  let query = 'SELECT * FROM passwords WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (vaultId !== undefined) {
    query += ` AND vault_id = $${paramIndex++}`;
    params.push(vaultId);
  }

  if (search) {
    query += ` AND (title ILIKE $${paramIndex++} OR username ILIKE $${paramIndex++} OR url ILIKE $${paramIndex++})`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY favorite DESC, updated_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getPasswordById(id: number): Promise<Password | null> {
  const result = await pool.query('SELECT * FROM passwords WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getPasswordDecrypted(id: number): Promise<PasswordDecrypted | null> {
  const password = await getPasswordById(id);
  if (!password) return null;

  return {
    ...password,
    password: decrypt(password.password_encrypted),
    notes: password.notes_encrypted ? decrypt(password.notes_encrypted) : null
  };
}

export async function createPassword(password: CreatePasswordRequest): Promise<Password> {
  const encryptedPassword = encrypt(password.password);
  const encryptedNotes = password.notes ? encrypt(password.notes) : null;

  const result = await pool.query(
    `INSERT INTO passwords (vault_id, title, username, password_encrypted, url, notes_encrypted, tags, favorite)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      password.vault_id || null,
      password.title,
      password.username || null,
      encryptedPassword,
      password.url || null,
      encryptedNotes,
      password.tags || null,
      password.favorite || false
    ]
  );
  return result.rows[0];
}

export async function updatePassword(id: number, updates: UpdatePasswordRequest): Promise<Password | null> {
  const current = await getPasswordById(id);
  if (!current) return null;

  const fields: string[] = ['updated_at = NOW()'];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.vault_id !== undefined) {
    fields.push(`vault_id = $${paramIndex++}`);
    values.push(updates.vault_id);
  }
  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.username !== undefined) {
    fields.push(`username = $${paramIndex++}`);
    values.push(updates.username);
  }
  if (updates.password !== undefined) {
    fields.push(`password_encrypted = $${paramIndex++}`);
    values.push(encrypt(updates.password));
  }
  if (updates.url !== undefined) {
    fields.push(`url = $${paramIndex++}`);
    values.push(updates.url);
  }
  if (updates.notes !== undefined) {
    fields.push(`notes_encrypted = $${paramIndex++}`);
    values.push(updates.notes ? encrypt(updates.notes) : null);
  }
  if (updates.tags !== undefined) {
    fields.push(`tags = $${paramIndex++}`);
    values.push(updates.tags);
  }
  if (updates.favorite !== undefined) {
    fields.push(`favorite = $${paramIndex++}`);
    values.push(updates.favorite);
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE passwords SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deletePassword(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM passwords WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Stats
export async function getStats() {
  const [totalPasswords, vaultCount, favoriteCount] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM passwords'),
    pool.query('SELECT COUNT(*) FROM vaults'),
    pool.query('SELECT COUNT(*) FROM passwords WHERE favorite = true')
  ]);

  return {
    totalPasswords: parseInt(totalPasswords.rows[0].count, 10),
    vaults: parseInt(vaultCount.rows[0].count, 10),
    favorites: parseInt(favoriteCount.rows[0].count, 10)
  };
}

// Password generator
export function generatePassword(length: number = 16, options = { uppercase: true, lowercase: true, numbers: true, symbols: true }): string {
  let charset = '';
  if (options.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (options.numbers) charset += '0123456789';
  if (options.symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}

export { pool };
