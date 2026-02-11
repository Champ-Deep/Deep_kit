import pool from './database';
import { Campaign, CreateCampaignRequest } from '../types';

/**
 * Build UTM URL from parameters
 */
export const buildUTMUrl = (
  baseUrl: string,
  utmSource?: string,
  utmMedium?: string,
  utmCampaign?: string,
  utmTerm?: string,
  utmContent?: string
): string => {
  const url = new URL(baseUrl);

  if (utmSource) url.searchParams.set('utm_source', utmSource);
  if (utmMedium) url.searchParams.set('utm_medium', utmMedium);
  if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
  if (utmTerm) url.searchParams.set('utm_term', utmTerm);
  if (utmContent) url.searchParams.set('utm_content', utmContent);

  return url.toString();
};

/**
 * Create campaign
 */
export const createCampaign = async (request: CreateCampaignRequest): Promise<Campaign> => {
  const finalUrl = buildUTMUrl(
    request.baseUrl,
    request.utmSource,
    request.utmMedium,
    request.utmCampaign,
    request.utmTerm,
    request.utmContent
  );

  const result = await pool.query(
    `INSERT INTO campaigns (name, utm_source, utm_medium, utm_campaign, utm_term, utm_content, base_url, final_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      request.name,
      request.utmSource || null,
      request.utmMedium || null,
      request.utmCampaign || null,
      request.utmTerm || null,
      request.utmContent || null,
      request.baseUrl,
      finalUrl,
      request.createdBy || null
    ]
  );

  return result.rows[0];
};

/**
 * Get campaign by ID
 */
export const getCampaignById = async (id: number): Promise<Campaign | null> => {
  const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
  return result.rows[0] || null;
};

/**
 * Get all campaigns
 */
export const getAllCampaigns = async (): Promise<Campaign[]> => {
  const result = await pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
  return result.rows;
};

/**
 * Update campaign
 */
export const updateCampaign = async (
  id: number,
  updates: Partial<CreateCampaignRequest>
): Promise<Campaign | null> => {
  const campaign = await getCampaignById(id);
  if (!campaign) return null;

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  // If any UTM parameters change, rebuild the final URL
  const needsRebuild =
    updates.baseUrl !== undefined ||
    updates.utmSource !== undefined ||
    updates.utmMedium !== undefined ||
    updates.utmCampaign !== undefined ||
    updates.utmTerm !== undefined ||
    updates.utmContent !== undefined;

  if (needsRebuild) {
    const finalUrl = buildUTMUrl(
      updates.baseUrl || campaign.base_url,
      updates.utmSource !== undefined ? updates.utmSource : campaign.utm_source || undefined,
      updates.utmMedium !== undefined ? updates.utmMedium : campaign.utm_medium || undefined,
      updates.utmCampaign !== undefined ? updates.utmCampaign : campaign.utm_campaign || undefined,
      updates.utmTerm !== undefined ? updates.utmTerm : campaign.utm_term || undefined,
      updates.utmContent !== undefined ? updates.utmContent : campaign.utm_content || undefined
    );

    if (updates.baseUrl) {
      fields.push(`base_url = $${paramIndex++}`);
      values.push(updates.baseUrl);
    }
    if (updates.utmSource !== undefined) {
      fields.push(`utm_source = $${paramIndex++}`);
      values.push(updates.utmSource);
    }
    if (updates.utmMedium !== undefined) {
      fields.push(`utm_medium = $${paramIndex++}`);
      values.push(updates.utmMedium);
    }
    if (updates.utmCampaign !== undefined) {
      fields.push(`utm_campaign = $${paramIndex++}`);
      values.push(updates.utmCampaign);
    }
    if (updates.utmTerm !== undefined) {
      fields.push(`utm_term = $${paramIndex++}`);
      values.push(updates.utmTerm);
    }
    if (updates.utmContent !== undefined) {
      fields.push(`utm_content = $${paramIndex++}`);
      values.push(updates.utmContent);
    }

    fields.push(`final_url = $${paramIndex++}`);
    values.push(finalUrl);
  }

  if (fields.length === 0) return campaign;

  values.push(id);
  const result = await pool.query(
    `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
};

/**
 * Delete campaign
 */
export const deleteCampaign = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
  return result.rowCount !== null && result.rowCount > 0;
};

/**
 * Bulk create campaigns from CSV data
 */
export const bulkCreateCampaigns = async (
  campaigns: CreateCampaignRequest[]
): Promise<Campaign[]> => {
  const createdCampaigns: Campaign[] = [];

  for (const request of campaigns) {
    try {
      const campaign = await createCampaign(request);
      createdCampaigns.push(campaign);
    } catch (error) {
      console.error('Failed to create campaign:', request.name, error);
    }
  }

  return createdCampaigns;
};
