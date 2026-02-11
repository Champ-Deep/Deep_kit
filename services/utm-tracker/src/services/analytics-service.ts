import geoip from 'geoip-lite';
import pool from './database';
import { UTMClick, CampaignAnalytics } from '../types';

/**
 * Track click event
 */
export const trackClick = async (
  campaignId: number,
  ipAddress: string,
  userAgent: string,
  referrer: string | null
): Promise<void> => {
  // Get geo location
  const geo = geoip.lookup(ipAddress);
  const country = geo?.country || null;
  const city = geo?.city || null;

  await pool.query(
    `INSERT INTO utm_clicks (campaign_id, ip_address, user_agent, referrer, country, city)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [campaignId, ipAddress, userAgent, referrer, country, city]
  );
};

/**
 * Get campaign analytics
 */
export const getCampaignAnalytics = async (campaignId: number): Promise<CampaignAnalytics | null> => {
  // Get campaign details
  const campaignResult = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
  if (campaignResult.rows.length === 0) return null;
  const campaign = campaignResult.rows[0];

  // Get total clicks
  const totalClicksResult = await pool.query(
    'SELECT COUNT(*) as count FROM utm_clicks WHERE campaign_id = $1',
    [campaignId]
  );
  const totalClicks = parseInt(totalClicksResult.rows[0].count);

  // Clicks by date (last 30 days)
  const clicksByDateResult = await pool.query(
    `SELECT DATE(clicked_at) as date, COUNT(*) as count
     FROM utm_clicks
     WHERE campaign_id = $1 AND clicked_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(clicked_at)
     ORDER BY date DESC`,
    [campaignId]
  );
  const clicksByDate = clicksByDateResult.rows.map(row => ({
    date: row.date.toISOString().split('T')[0],
    count: parseInt(row.count)
  }));

  // Clicks by country
  const clicksByCountryResult = await pool.query(
    `SELECT country, COUNT(*) as count
     FROM utm_clicks
     WHERE campaign_id = $1 AND country IS NOT NULL
     GROUP BY country
     ORDER BY count DESC
     LIMIT 10`,
    [campaignId]
  );
  const clicksByCountry = clicksByCountryResult.rows.map(row => ({
    country: row.country,
    count: parseInt(row.count)
  }));

  // Clicks by referrer
  const clicksByReferrerResult = await pool.query(
    `SELECT referrer, COUNT(*) as count
     FROM utm_clicks
     WHERE campaign_id = $1 AND referrer IS NOT NULL
     GROUP BY referrer
     ORDER BY count DESC
     LIMIT 10`,
    [campaignId]
  );
  const clicksByReferrer = clicksByReferrerResult.rows.map(row => ({
    referrer: row.referrer,
    count: parseInt(row.count)
  }));

  // Recent clicks
  const recentClicksResult = await pool.query(
    `SELECT * FROM utm_clicks
     WHERE campaign_id = $1
     ORDER BY clicked_at DESC
     LIMIT 20`,
    [campaignId]
  );
  const recentClicks = recentClicksResult.rows;

  return {
    campaign,
    totalClicks,
    clicksByDate,
    clicksByCountry,
    clicksByReferrer,
    recentClicks
  };
};

/**
 * Get global stats
 */
export const getGlobalStats = async (): Promise<{
  totalCampaigns: number;
  totalClicks: number;
  campaignsToday: number;
  clicksToday: number;
}> => {
  const totalCampaignsResult = await pool.query('SELECT COUNT(*) as count FROM campaigns');
  const totalCampaigns = parseInt(totalCampaignsResult.rows[0].count);

  const totalClicksResult = await pool.query('SELECT COUNT(*) as count FROM utm_clicks');
  const totalClicks = parseInt(totalClicksResult.rows[0].count);

  const campaignsTodayResult = await pool.query(
    `SELECT COUNT(*) as count FROM campaigns WHERE DATE(created_at) = CURRENT_DATE`
  );
  const campaignsToday = parseInt(campaignsTodayResult.rows[0].count);

  const clicksTodayResult = await pool.query(
    `SELECT COUNT(*) as count FROM utm_clicks WHERE DATE(clicked_at) = CURRENT_DATE`
  );
  const clicksToday = parseInt(clicksTodayResult.rows[0].count);

  return { totalCampaigns, totalClicks, campaignsToday, clicksToday };
};

/**
 * Get all campaign clicks for export
 */
export const getAllCampaignClicks = async (campaignId: number): Promise<UTMClick[]> => {
  const result = await pool.query(
    'SELECT * FROM utm_clicks WHERE campaign_id = $1 ORDER BY clicked_at DESC',
    [campaignId]
  );
  return result.rows;
};
