const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

/**
 * Web Fetch Tool
 * Downloads content from URLs (HTML, JSON, text, etc.)
 */

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Fetch content from a URL (HTML, JSON, text). Returns response body and headers.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to fetch (must start with http:// or https://)'
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE'],
            description: 'HTTP method (default: GET)'
          },
          headers: {
            type: 'object',
            description: 'Optional HTTP headers as key-value pairs'
          },
          body: {
            type: 'string',
            description: 'Request body for POST/PUT (JSON string or form data)'
          },
          timeout: {
            type: 'number',
            description: 'Request timeout in milliseconds (default: 30000, max: 60000)'
          }
        },
        required: ['url']
      }
    }
  },

  async execute(args, context) {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = 30000
    } = args;

    try {
      // Validate URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return {
          success: false,
          error: 'URL must start with http:// or https://'
        };
      }

      // Cap timeout at 60 seconds
      const safeTimeout = Math.min(timeout, 60000);

      // Build request config
      const config = {
        method,
        url,
        headers: {
          'User-Agent': 'DeepKit-Messenger/1.0',
          ...headers
        },
        timeout: safeTimeout,
        maxContentLength: 10 * 1024 * 1024, // 10MB max
        maxBodyLength: 10 * 1024 * 1024,
        validateStatus: () => true // Accept all status codes
      };

      // Add body if provided
      if (body && (method === 'POST' || method === 'PUT')) {
        // Try to parse as JSON, fall back to raw string
        try {
          config.data = JSON.parse(body);
          config.headers['Content-Type'] = 'application/json';
        } catch {
          config.data = body;
          config.headers['Content-Type'] = 'text/plain';
        }
      }

      const startTime = Date.now();
      const response = await axios(config);
      const duration = Date.now() - startTime;

      // Determine content type
      const contentType = response.headers['content-type'] || 'unknown';
      const isJson = contentType.includes('application/json');
      const isHtml = contentType.includes('text/html');
      const isText = contentType.includes('text/');

      // Process response body
      let processedBody = response.data;
      let truncated = false;

      if (typeof processedBody === 'string' && processedBody.length > 5000) {
        processedBody = processedBody.substring(0, 5000) + '\n... (truncated)';
        truncated = true;
      }

      return {
        success: response.status >= 200 && response.status < 400,
        message: `Fetched ${url} (${response.status} ${response.statusText}) in ${duration}ms`,
        data: {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          contentType,
          contentLength: response.headers['content-length'] || response.data?.length || 0,
          body: processedBody,
          truncated,
          duration: `${duration}ms`,
          headers: {
            'content-type': response.headers['content-type'],
            'content-length': response.headers['content-length'],
            'server': response.headers['server'],
            'date': response.headers['date']
          }
        }
      };

    } catch (error) {
      logger.error('web_fetch error:', error.message);

      return {
        success: false,
        error: error.message,
        data: {
          url,
          method,
          code: error.code,
          timeout: error.code === 'ECONNABORTED'
        }
      };
    }
  }
};
