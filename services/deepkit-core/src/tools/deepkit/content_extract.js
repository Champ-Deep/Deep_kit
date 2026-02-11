/**
 * content_extract - Extract content from URLs (YouTube, GitHub, webpages)
 * Wraps ContentExtractor for LLM tool calling
 */
const { extractContent } = require('../../content/ContentExtractor');

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'content_extract',
      description: 'Extract content from a URL. Supports YouTube videos (transcripts), GitHub repositories (README), and general webpages. Use this when the user shares a URL and wants to understand, summarize, or extract information from it.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to extract content from (YouTube, GitHub, or any webpage)'
          },
          context: {
            type: 'string',
            description: 'Optional context about what the user wants from this content'
          }
        },
        required: ['url']
      }
    }
  },

  execute: async (args, context) => {
    const { url, context: userContext } = args;

    if (!url) {
      return {
        success: false,
        error: 'URL is required.',
        type: 'note',
        data: {
          action: 'found',
          message: 'URL is required to extract content.'
        }
      };
    }

    try {
      const result = await extractContent(url, userContext || '');

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to extract content',
          type: 'note',
          data: {
            action: 'found',
            note: {
              id: 'error',
              title: 'Extraction Failed',
              content: result.error || 'Could not extract content from the URL.'
            }
          }
        };
      }

      // Build readable content based on type
      let title, content;

      switch (result.contentType) {
        case 'video': {
          // YouTube video
          title = result.title || 'YouTube Video';
          content = result.transcript
            ? `**Video:** ${result.title}\n**Author:** ${result.author}\n\n**Transcript:**\n${result.transcript}`
            : `**Video:** ${result.title}\n**Author:** ${result.author}\n\nTranscript not available.`;
          break;
        }

        case 'repository': {
          // GitHub repo
          title = result.title || `${result.owner}/${result.repo}`;
          const stars = result.stars ? `${result.stars} stars` : '';
          const lang = result.language || 'Unknown language';
          const topics = result.topics?.length > 0 ? result.topics.join(', ') : '';

          content = `**Repository:** ${result.title}\n`;
          if (result.description) content += `**Description:** ${result.description}\n`;
          content += `**Language:** ${lang}`;
          if (stars) content += ` | **Stars:** ${stars}`;
          if (topics) content += `\n**Topics:** ${topics}`;
          if (result.readme) content += `\n\n**README:**\n${result.readme}`;
          break;
        }

        case 'article':
        default: {
          // Webpage/article
          title = result.title || 'Web Content';
          content = '';
          if (result.description) content += `${result.description}\n\n`;
          if (result.author) content += `**Author:** ${result.author}\n`;
          if (result.publishDate) content += `**Published:** ${result.publishDate}\n`;
          if (content) content += '\n';
          content += result.content || 'No content extracted.';
          break;
        }
      }

      // Return as a note template for consistent UI
      return {
        success: true,
        type: 'note',
        data: {
          action: 'found',
          note: {
            id: `extract-${Date.now()}`,
            title: title,
            content: content,
            created_at: new Date().toISOString()
          }
        },
        message: `Extracted content from ${result.urlType || 'webpage'}: "${title}"`,
        suggestions: [
          'Summarize this content',
          'What are the key points?',
          'Save this as a note'
        ]
      };

    } catch (error) {
      return {
        success: false,
        error: `Content extraction failed: ${error.message}`,
        type: 'note',
        data: {
          action: 'found',
          note: {
            id: 'error',
            title: 'Error',
            content: `Failed to extract content: ${error.message}`
          }
        }
      };
    }
  }
};
