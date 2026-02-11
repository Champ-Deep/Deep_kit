import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import pool from './database';
import { ShortLink, CreateLinkRequest, LinkClick } from '../types';

/**
 * Generate short code (auto or validate custom)
 */
export const generateShortCode = (customCode?: string): string => {
  if (customCode) {
    // Validate custom code (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(customCode)) {
      throw new Error('Custom code must contain only letters, numbers, hyphens, and underscores');
    }
    return customCode;
  }
  // Auto-generate 7-character code
  return nanoid(7);
};

/**
 * Check if short code is available
 */
export const isShortCodeAvailable = async (shortCode: string): Promise<boolean> => {
  const result = await pool.query(
    'SELECT id FROM short_links WHERE short_code = $1',
    [shortCode]
  );
  return result.rows.length === 0;
};

/**
 * Create short link
 */
export const createShortLink = async (request: CreateLinkRequest): Promise<ShortLink> => {
  const shortCode = generateShortCode(request.customCode);

  // Check availability
  const available = await isShortCodeAvailable(shortCode);
  if (!available) {
    throw new Error('Short code already exists');
  }

  // Hash password if provided
  let passwordHash = null;
  if (request.password) {
    passwordHash = await bcrypt.hash(request.password, 10);
  }

  // Parse expiration
  let expiresAt = null;
  if (request.expiresAt) {
    expiresAt = new Date(request.expiresAt);
  }

  const result = await pool.query(
    `INSERT INTO short_links (short_code, original_url, custom_code, password_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [shortCode, request.originalUrl, !!request.customCode, passwordHash, expiresAt]
  );

  return result.rows[0];
};

/**
 * Get link by short code
 */
export const getLinkByShortCode = async (shortCode: string): Promise<ShortLink | null> => {
  const result = await pool.query(
    'SELECT * FROM short_links WHERE short_code = $1',
    [shortCode]
  );
  return result.rows[0] || null;
};

/**
 * Get link by ID
 */
export const getLinkById = async (id: number): Promise<ShortLink | null> => {
  const result = await pool.query(
    'SELECT * FROM short_links WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Get all links
 */
export const getAllLinks = async (): Promise<ShortLink[]> => {
  const result = await pool.query(
    'SELECT * FROM short_links ORDER BY created_at DESC'
  );
  return result.rows;
};

/**
 * Update link
 */
export const updateLink = async (
  id: number,
  updates: Partial<CreateLinkRequest>
): Promise<ShortLink | null> => {
  const link = await getLinkById(id);
  if (!link) return null;

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.originalUrl) {
    fields.push(`original_url = $${paramIndex++}`);
    values.push(updates.originalUrl);
  }

  if (updates.password !== undefined) {
    const passwordHash = updates.password ? await bcrypt.hash(updates.password, 10) : null;
    fields.push(`password_hash = $${paramIndex++}`);
    values.push(passwordHash);
  }

  if (updates.expiresAt !== undefined) {
    const expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;
    fields.push(`expires_at = $${paramIndex++}`);
    values.push(expiresAt);
  }

  if (fields.length === 0) return link;

  values.push(id);
  const result = await pool.query(
    `UPDATE short_links SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
};

/**
 * Delete link
 */
export const deleteLink = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM short_links WHERE id = $1', [id]);
  return result.rowCount !== null && result.rowCount > 0;
};

/**
 * Update QR code ID for link
 */
export const updateLinkQRCode = async (linkId: number, qrCodeId: number): Promise<void> => {
  await pool.query(
    'UPDATE short_links SET qr_code_id = $1 WHERE id = $2',
    [qrCodeId, linkId]
  );
};

/**
 * Verify password
 */
export const verifyPassword = async (link: ShortLink, password: string): Promise<boolean> => {
  if (!link.password_hash) return true;
  return bcrypt.compare(password, link.password_hash);
};

/**
 * Check if link is expired
 */
export const isLinkExpired = (link: ShortLink): boolean => {
  if (!link.expires_at) return false;
  return new Date() > new Date(link.expires_at);
};
