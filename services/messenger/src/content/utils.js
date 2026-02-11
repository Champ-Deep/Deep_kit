/**
 * Utility functions for content extraction
 */

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch (error) {
    return false;
  }
}

/**
 * Detects URL type (YouTube, GitHub, article, etc.)
 * @param {string} url - URL to analyze
 * @returns {string} - URL type
 */
function detectUrlType(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }
    if (hostname.includes('github.com')) {
      return 'github';
    }
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter';
    }
    if (hostname.includes('linkedin.com')) {
      return 'linkedin';
    }
    if (hostname.includes('medium.com')) {
      return 'article';
    }

    return 'webpage';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Extracts YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 */
function extractYouTubeId(url) {
  try {
    const urlObj = new URL(url);

    // Standard YouTube URL: youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }

    // Short URL: youtu.be/VIDEO_ID
    if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts GitHub repo owner and name from URL
 * @param {string} url - GitHub URL
 * @returns {Object|null} - { owner, repo } or null
 */
function extractGitHubRepo(url) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);

    if (parts.length >= 2) {
      return {
        owner: parts[0],
        repo: parts[1]
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Sanitizes text input
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} - Sanitized text
 */
function sanitizeText(text, maxLength = 5000) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove control characters
  let sanitized = text
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, maxLength);

  return sanitized;
}

/**
 * Checks if content contains URLs
 * @param {string} text - Text to check
 * @returns {string[]} - Array of URLs found
 */
function extractUrls(text) {
  if (!text) return [];

  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);

  return matches ? matches.map(url => url.trim()) : [];
}

module.exports = {
  isValidUrl,
  detectUrlType,
  extractYouTubeId,
  extractGitHubRepo,
  sanitizeText,
  extractUrls
};
