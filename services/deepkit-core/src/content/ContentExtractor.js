/**
 * DeepKit Messenger - Content Extraction
 * Ported from clawdbot with DeepKit naming
 *
 * Extracts content from URLs (YouTube, GitHub, webpages)
 */

const { YoutubeTranscript } = require('youtube-transcript');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const {
  isValidUrl,
  detectUrlType,
  extractYouTubeId,
  extractGitHubRepo,
  sanitizeText
} = require('../utils/validators');

/**
 * Main content extraction orchestrator
 * @param {string} url - URL to extract content from
 * @param {string} message - Optional context message
 * @returns {Promise<Object>} - Extracted content
 */
async function extractContent(url, message = '') {
  if (!isValidUrl(url)) {
    logger.warn(`Invalid URL provided: ${url}`);
    return {
      success: false,
      error: 'Invalid URL',
      url
    };
  }

  const urlType = detectUrlType(url);
  logger.info(`Extracting content from ${urlType}: ${url}`);

  try {
    let extraction;

    switch (urlType) {
      case 'youtube':
        extraction = await extractYouTubeContent(url);
        break;
      case 'github':
        extraction = await extractGitHubContent(url);
        break;
      case 'twitter':
      case 'linkedin':
      case 'article':
      case 'webpage':
        extraction = await extractWebpageContent(url);
        break;
      default:
        extraction = await extractWebpageContent(url);
    }

    return {
      success: true,
      url,
      urlType,
      contextMessage: sanitizeText(message, 500),
      ...extraction
    };
  } catch (error) {
    logger.error(`Content extraction failed for ${url}: ${error.message}`);
    return {
      success: false,
      error: error.message,
      url,
      urlType
    };
  }
}

/**
 * Extract YouTube video transcript and metadata
 * @param {string} url - YouTube URL
 * @returns {Promise<Object>}
 */
async function extractYouTubeContent(url) {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    throw new Error('Could not extract YouTube video ID');
  }

  logger.debug(`Extracting YouTube video: ${videoId}`);

  try {
    // Fetch transcript
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);

    // Combine transcript segments
    const fullTranscript = transcriptData
      .map(segment => segment.text)
      .join(' ');

    // Get video metadata via oEmbed API (no API key required)
    let metadata = {};
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await axios.get(oembedUrl);
      metadata = {
        title: response.data.title,
        author: response.data.author_name,
        thumbnail: response.data.thumbnail_url
      };
    } catch (metaError) {
      logger.warn(`Could not fetch YouTube metadata: ${metaError.message}`);
    }

    return {
      contentType: 'video',
      platform: 'youtube',
      videoId,
      title: metadata.title || 'Unknown',
      author: metadata.author || 'Unknown',
      thumbnail: metadata.thumbnail || '',
      transcript: sanitizeText(fullTranscript, 10000),
      transcriptLength: fullTranscript.length,
      wordCount: fullTranscript.split(/\s+/).length
    };
  } catch (error) {
    logger.error(`YouTube extraction failed: ${error.message}`);

    // If transcript fails, return basic metadata
    return {
      contentType: 'video',
      platform: 'youtube',
      videoId,
      error: 'Transcript not available',
      title: 'Unknown',
      transcript: ''
    };
  }
}

/**
 * Extract GitHub repository README and metadata
 * @param {string} url - GitHub URL
 * @returns {Promise<Object>}
 */
async function extractGitHubContent(url) {
  const repoInfo = extractGitHubRepo(url);

  if (!repoInfo) {
    throw new Error('Could not extract GitHub repository information');
  }

  const { owner, repo } = repoInfo;
  logger.debug(`Extracting GitHub repo: ${owner}/${repo}`);

  try {
    // Fetch repository metadata via GitHub API
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = {};

    // Add GitHub token if available (for higher rate limits)
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const repoResponse = await axios.get(repoUrl, { headers });
    const repoData = repoResponse.data;

    // Fetch README
    let readmeContent = '';
    try {
      const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
      const readmeResponse = await axios.get(readmeUrl, {
        headers: {
          ...headers,
          Accept: 'application/vnd.github.v3.raw'
        }
      });
      readmeContent = sanitizeText(readmeResponse.data, 15000);
    } catch (readmeError) {
      logger.warn(`Could not fetch README: ${readmeError.message}`);
    }

    return {
      contentType: 'repository',
      platform: 'github',
      owner,
      repo,
      title: repoData.full_name,
      description: repoData.description || '',
      stars: repoData.stargazers_count,
      language: repoData.language,
      topics: repoData.topics || [],
      readme: readmeContent,
      readmeLength: readmeContent.length,
      lastUpdated: repoData.updated_at,
      url: repoData.html_url
    };
  } catch (error) {
    logger.error(`GitHub extraction failed: ${error.message}`);

    return {
      contentType: 'repository',
      platform: 'github',
      owner,
      repo,
      error: error.message,
      title: `${owner}/${repo}`,
      readme: ''
    };
  }
}

/**
 * Extract webpage/article content
 * @param {string} url - Webpage URL
 * @returns {Promise<Object>}
 */
async function extractWebpageContent(url) {
  logger.debug(`Extracting webpage: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 second timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract title
    const title = $('title').text().trim() ||
                 $('meta[property="og:title"]').attr('content') ||
                 'Unknown';

    // Extract description
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') ||
                       '';

    // Extract main content
    // Try common article selectors
    let content = '';
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        break;
      }
    }

    // If no specific content area found, get body text
    if (!content) {
      // Remove script and style tags
      $('script, style, nav, footer, header').remove();
      content = $('body').text().trim();
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();

    // Extract author if available
    const author = $('meta[name="author"]').attr('content') ||
                  $('[rel="author"]').text().trim() ||
                  '';

    // Extract publish date if available
    const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                       $('time').attr('datetime') ||
                       '';

    return {
      contentType: 'article',
      platform: detectUrlType(url),
      title: sanitizeText(title, 200),
      description: sanitizeText(description, 500),
      author: sanitizeText(author, 100),
      publishDate,
      content: sanitizeText(content, 20000),
      contentLength: content.length,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      url
    };
  } catch (error) {
    logger.error(`Webpage extraction failed: ${error.message}`);

    return {
      contentType: 'article',
      platform: 'webpage',
      error: error.message,
      title: 'Unknown',
      content: '',
      url
    };
  }
}

/**
 * Extract content from multiple URLs
 * @param {string[]} urls - Array of URLs
 * @param {string} message - Context message
 * @returns {Promise<Object[]>}
 */
async function extractMultipleContents(urls, message = '') {
  logger.info(`Extracting content from ${urls.length} URLs`);

  const extractions = await Promise.allSettled(
    urls.map(url => extractContent(url, message))
  );

  return extractions.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        success: false,
        error: result.reason.message,
        url: urls[index]
      };
    }
  });
}

module.exports = {
  extractContent,
  extractYouTubeContent,
  extractGitHubContent,
  extractWebpageContent,
  extractMultipleContents
};
