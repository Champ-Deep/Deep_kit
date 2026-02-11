const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'deepkit-store',
  port: 5432,
  database: process.env.POSTGRES_DB || 'hubconfig',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

async function initThemeSettings() {
  try {
    // First create the database if it doesn't exist (optional, depends on setup)
    // For now we'll assume we can connect to a database. 
    // In DeepKit, we usually have a 'hubconfig' or similar.
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_theme_settings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) UNIQUE DEFAULT 'default',
        theme_preset VARCHAR(50) DEFAULT 'classic-crt',
        scanlines_enabled BOOLEAN DEFAULT true,
        rgb_ghosting_enabled BOOLEAN DEFAULT false,
        glow_enabled BOOLEAN DEFAULT true,
        phosphor_color VARCHAR(7) DEFAULT '#39FF14',
        glow_intensity INTEGER DEFAULT 50,
        custom_settings JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Theme settings table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize theme settings table:', error.message);
  }
}

async function getThemeSettings(userId = 'default') {
  try {
    const result = await pool.query(
      'SELECT * FROM user_theme_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        theme_preset: 'classic-crt',
        scanlines_enabled: true,
        rgb_ghosting_enabled: false,
        glow_enabled: true,
        phosphor_color: '#39FF14',
        glow_intensity: 50
      };
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error getting theme settings:', error.message);
    return {
      theme_preset: 'classic-crt',
      scanlines_enabled: true,
      rgb_ghosting_enabled: false,
      glow_enabled: true,
      phosphor_color: '#39FF14',
      glow_intensity: 50
    };
  }
}

async function saveThemeSettings(userId = 'default', settings) {
  try {
    const result = await pool.query(
      `INSERT INTO user_theme_settings (user_id, theme_preset, scanlines_enabled, rgb_ghosting_enabled, glow_enabled, phosphor_color, glow_intensity, custom_settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         theme_preset = EXCLUDED.theme_preset,
         scanlines_enabled = EXCLUDED.scanlines_enabled,
         rgb_ghosting_enabled = EXCLUDED.rgb_ghosting_enabled,
         glow_enabled = EXCLUDED.glow_enabled,
         phosphor_color = EXCLUDED.phosphor_color,
         glow_intensity = EXCLUDED.glow_intensity,
         custom_settings = EXCLUDED.custom_settings,
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        settings.theme_preset,
        settings.scanlines_enabled,
        settings.rgb_ghosting_enabled,
        settings.glow_enabled,
        settings.phosphor_color,
        settings.glow_intensity,
        settings.custom_settings || null
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error saving theme settings:', error.message);
    throw error;
  }
}

module.exports = { initThemeSettings, getThemeSettings, saveThemeSettings };
