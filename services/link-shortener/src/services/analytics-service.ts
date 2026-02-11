import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import pool from './database';
import { LinkClick, LinkAnalytics } from '../types';

/**
 * Track click event
 */
export const trackClick = async (
  linkId: number,
  ipAddress: string,
  userAgent: string,
  referrer: string | null
): Promise<void> => {
  // Parse user agent
  const parser = new UAParser(userAgent);
  const device = parser.getDevice().type || 'desktop';
  const browser = parser.getBrowser().name || 'Unknown';
  const os = parser.getOS().name || 'Unknown';

  // Get geo location
  const geo = geoip.lookup(ipAddress);
  const country = geo?.country || null;
  const city = geo?.city || null;

  await pool.query(
    `INSERT INTO link_clicks (link_id, ip_address, user_agent, referrer, country, city, device, browser, os)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [linkId, ipAddress, userAgent, referrer, country, city, device, browser, os]
  );
};

/**
 * Get link analytics
 */
export const getLinkAnalytics = async (linkId: number): Promise<LinkAnalytics | null> => {
  // Get link details
  const linkResult = await pool.query('SELECT * FROM short_links WHERE id = $1', [linkId]);
  if (linkResult.rows.length === 0) return null;
  const link = linkResult.rows[0];

  // Get total clicks
  const totalClicksResult = await pool.query(
    'SELECT COUNT(*) as count FROM link_clicks WHERE link_id = $1',
    [linkId]
  );
  const totalClicks = parseInt(totalClicksResult.rows[0].count);

  // Clicks by date (last 30 days)
  const clicksByDateResult = await pool.query(
    `SELECT DATE(clicked_at) as date, COUNT(*) as count
     FROM link_clicks
     WHERE link_id = $1 AND clicked_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(clicked_at)
     ORDER BY date DESC`,
    [linkId]
  );
  const clicksByDate = clicksByDateResult.rows.map(row => ({
    date: row.date.toISOString().split('T')[0],
    count: parseInt(row.count)
  }));

  // Clicks by country
  const clicksByCountryResult = await pool.query(
    `SELECT country, COUNT(*) as count
     FROM link_clicks
     WHERE link_id = $1 AND country IS NOT NULL
     GROUP BY country
     ORDER BY count DESC
     LIMIT 10`,
    [linkId]
  );
  const clicksByCountry = clicksByCountryResult.rows.map(row => ({
    country: row.country,
    count: parseInt(row.count)
  }));

  // Clicks by device
  const clicksByDeviceResult = await pool.query(
    `SELECT device, COUNT(*) as count
     FROM link_clicks
     WHERE link_id = $1
     GROUP BY device
     ORDER BY count DESC`,
    [linkId]
  );
  const clicksByDevice = clicksByDeviceResult.rows.map(row => ({
    device: row.device,
    count: parseInt(row.count)
  }));

  // Clicks by browser
  const clicksByBrowserResult = await pool.query(
    `SELECT browser, COUNT(*) as count
     FROM link_clicks
     WHERE link_id = $1
     GROUP BY browser
     ORDER BY count DESC
     LIMIT 10`,
    [linkId]
  );
  const clicksByBrowser = clicksByBrowserResult.rows.map(row => ({
    browser: row.browser,
    count: parseInt(row.count)
  }));

  // Recent clicks
  const recentClicksResult = await pool.query(
    `SELECT * FROM link_clicks
     WHERE link_id = $1
     ORDER BY clicked_at DESC
     LIMIT 20`,
    [linkId]
  );
  const recentClicks = recentClicksResult.rows;

  return {
    link,
    totalClicks,
    clicksByDate,
    clicksByCountry,
    clicksByDevice,
    clicksByBrowser,
    recentClicks
  };
};

/**
 * Get global stats
 */
export const getGlobalStats = async (): Promise<{
  totalLinks: number;
  totalClicks: number;
  linksToday: number;
  clicksToday: number;
}> => {
  const totalLinksResult = await pool.query('SELECT COUNT(*) as count FROM short_links');
  const totalLinks = parseInt(totalLinksResult.rows[0].count);

  const totalClicksResult = await pool.query('SELECT COUNT(*) as count FROM link_clicks');
  const totalClicks = parseInt(totalClicksResult.rows[0].count);

  const linksTodayResult = await pool.query(
    `SELECT COUNT(*) as count FROM short_links WHERE DATE(created_at) = CURRENT_DATE`
  );
  const linksToday = parseInt(linksTodayResult.rows[0].count);

  const clicksTodayResult = await pool.query(
    `SELECT COUNT(*) as count FROM link_clicks WHERE DATE(clicked_at) = CURRENT_DATE`
  );
  const clicksToday = parseInt(clicksTodayResult.rows[0].count);

  return { totalLinks, totalClicks, linksToday, clicksToday };
};
