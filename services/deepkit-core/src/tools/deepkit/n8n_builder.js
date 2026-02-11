/**
 * n8n Workflow Builder Tool
 *
 * Translates natural language workflow descriptions into n8n workflow JSON.
 * Uses predefined templates for common workflow patterns.
 *
 * Patterns supported:
 * - "Create a workflow that sends an email when triggered"
 * - "Build an automation to fetch data from a URL"
 * - "Set up a process to send a Slack message"
 * - "Create a scheduled workflow that runs daily"
 */

const axios = require('axios');

const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL || 'http://deepkit-n8n:5678';
const N8N_API_URL = `${N8N_BASE_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY || '';

const apiHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (N8N_API_KEY) headers['X-N8N-API-KEY'] = N8N_API_KEY;
  return headers;
};

// Pre-defined workflow templates
const WORKFLOW_TEMPLATES = {
  webhook_respond: {
    description: 'Simple webhook that receives data and responds',
    nodes: (name, params) => [
      {
        id: 'trigger',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [250, 300],
        parameters: {
          path: params.path || name.toLowerCase().replace(/\s+/g, '-'),
          httpMethod: params.method || 'POST',
          responseMode: 'lastNode',
          responseData: 'allEntries'
        }
      },
      {
        id: 'respond',
        name: 'Response',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [500, 300],
        parameters: {
          respondWith: 'json',
          responseBody: '={{ JSON.stringify({ success: true, message: "Processed", data: $json }) }}'
        }
      }
    ],
    connections: {
      'Webhook Trigger': { main: [[{ node: 'Response', type: 'main', index: 0 }]] }
    }
  },

  scheduled_task: {
    description: 'Run a task on a schedule (cron)',
    nodes: (name, params) => [
      {
        id: 'schedule',
        name: 'Schedule',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
        position: [250, 300],
        parameters: {
          rule: {
            interval: [{
              field: 'cronExpression',
              expression: params.cron || '0 9 * * *'  // Default: daily at 9am
            }]
          }
        }
      },
      {
        id: 'action',
        name: 'Action',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [500, 300],
        parameters: {
          assignments: {
            assignments: [{
              id: 'timestamp',
              name: 'timestamp',
              value: '={{ $now.toISO() }}',
              type: 'string'
            }, {
              id: 'task',
              name: 'task',
              value: params.taskDescription || 'Scheduled task executed',
              type: 'string'
            }]
          }
        }
      }
    ],
    connections: {
      'Schedule': { main: [[{ node: 'Action', type: 'main', index: 0 }]] }
    }
  },

  http_request: {
    description: 'Make an HTTP request when triggered',
    nodes: (name, params) => [
      {
        id: 'trigger',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [250, 300],
        parameters: {
          path: name.toLowerCase().replace(/\s+/g, '-'),
          httpMethod: 'POST',
          responseMode: 'lastNode'
        }
      },
      {
        id: 'request',
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [500, 300],
        parameters: {
          method: params.httpMethod || 'GET',
          url: params.url || 'https://httpbin.org/get',
          options: {}
        }
      },
      {
        id: 'respond',
        name: 'Response',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [750, 300],
        parameters: {
          respondWith: 'allEntries'
        }
      }
    ],
    connections: {
      'Webhook Trigger': { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
      'HTTP Request': { main: [[{ node: 'Response', type: 'main', index: 0 }]] }
    }
  },

  data_transform: {
    description: 'Receive data, transform it, and respond',
    nodes: (name, params) => [
      {
        id: 'trigger',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [250, 300],
        parameters: {
          path: name.toLowerCase().replace(/\s+/g, '-'),
          httpMethod: 'POST',
          responseMode: 'lastNode'
        }
      },
      {
        id: 'code',
        name: 'Transform',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [500, 300],
        parameters: {
          jsCode: params.code || `
// Transform incoming data
const items = $input.all();
const result = items.map(item => ({
  ...item.json,
  processed: true,
  processedAt: new Date().toISOString()
}));
return result.map(r => ({ json: r }));
`
        }
      },
      {
        id: 'respond',
        name: 'Response',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [750, 300],
        parameters: {
          respondWith: 'allEntries'
        }
      }
    ],
    connections: {
      'Webhook Trigger': { main: [[{ node: 'Transform', type: 'main', index: 0 }]] },
      'Transform': { main: [[{ node: 'Response', type: 'main', index: 0 }]] }
    }
  }
};

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'n8n_builder',
      description: 'Build n8n workflows from natural language descriptions. Converts user intent into workflow templates.',
      parameters: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            description: 'Natural language description of the desired workflow'
          },
          template: {
            type: 'string',
            enum: ['webhook_respond', 'scheduled_task', 'http_request', 'data_transform'],
            description: 'Specific template to use (optional)'
          },
          params: {
            type: 'object',
            description: 'Template parameters (url, cron, etc.)'
          }
        },
        required: ['intent']
      }
    }
  },

  execute: async (args, context) => {
    const { intent, template: specifiedTemplate, params: userParams } = args;

    try {
      // Determine which template to use
      const templateKey = specifiedTemplate || detectTemplate(intent);
      const template = WORKFLOW_TEMPLATES[templateKey];

      if (!template) {
        return {
          success: false,
          message: `Could not determine workflow type from: "${intent}". Available templates: ${Object.keys(WORKFLOW_TEMPLATES).join(', ')}`,
          type: 'error',
          data: {
            message: `Supported patterns: webhook (receive data), scheduled (cron), http_request (fetch URLs), data_transform (process data)`
          }
        };
      }

      // Generate workflow name from intent
      const workflowName = generateWorkflowName(intent);

      // Extract parameters from intent
      const params = {
        ...extractParams(intent),
        ...(userParams || {})
      };

      // Build the workflow
      const nodes = template.nodes(workflowName, params);
      const connections = template.connections;

      // Create the workflow via n8n API
      const response = await axios.post(`${N8N_API_URL}/workflows`, {
        name: workflowName,
        nodes,
        connections,
        settings: { executionOrder: 'v1' }
      }, {
        timeout: 15000,
        headers: apiHeaders()
      });

      const workflow = response.data;

      // Activate it
      try {
        await axios.patch(`${N8N_API_URL}/workflows/${workflow.id}`, {
          active: true
        }, {
          timeout: 10000,
          headers: apiHeaders()
        });
      } catch (e) {
        // Created but not activated - OK
      }

      const webhookNode = nodes.find(n => n.type === 'n8n-nodes-base.webhook');
      const webhookPath = webhookNode?.parameters?.path;

      // Persist workflow metadata to Postgres
      if (context?.storage?.saveWorkflow) {
        try {
          await context.storage.saveWorkflow({
            n8nId: String(workflow.id),
            name: workflowName,
            template: templateKey,
            active: true,
            webhookPath: webhookPath,
            description: intent,
            userId: context.userId
          });
        } catch (e) {
          // Storage save failed - non-critical
        }
      }

      return {
        success: true,
        message: `Workflow "${workflowName}" created from template: ${templateKey}`,
        type: 'workflow',
        data: {
          action: 'created',
          workflow: {
            id: workflow.id,
            name: workflowName,
            active: true,
            nodes: nodes.length,
            template: templateKey,
            webhookPath: webhookPath
          },
          triggerInfo: webhookPath
            ? `Trigger via: curl -X POST http://localhost:5678/webhook/${webhookPath}`
            : 'Triggered on schedule'
        }
      };

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'n8n is not running. Start it with: docker compose up -d deepkit-n8n',
          type: 'error',
          data: { message: 'n8n connection refused' }
        };
      }
      return {
        success: false,
        message: `Failed to create workflow: ${error.message}`,
        type: 'error',
        data: { message: error.response?.data?.message || error.message }
      };
    }
  }
};

/**
 * Detect which template to use based on natural language intent
 */
function detectTemplate(intent) {
  const lowerIntent = intent.toLowerCase();

  // Scheduled / cron patterns
  if (lowerIntent.match(/(?:schedule|daily|hourly|weekly|every\s+\d|cron|recurring|repeat)/)) {
    return 'scheduled_task';
  }

  // HTTP request / fetch patterns
  if (lowerIntent.match(/(?:fetch|download|get\s+data|call\s+api|http\s+request|scrape|pull\s+from)/)) {
    return 'http_request';
  }

  // Transform / process patterns
  if (lowerIntent.match(/(?:transform|process|convert|parse|filter|map|clean\s+data)/)) {
    return 'data_transform';
  }

  // Default to webhook
  return 'webhook_respond';
}

/**
 * Generate a clean workflow name from intent
 */
function generateWorkflowName(intent) {
  // Remove common filler words
  const cleaned = intent
    .replace(/^(?:create|build|make|set up|setup)\s+(?:a\s+)?(?:workflow|automation|process)\s+(?:that|to|for|which)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter of each word
  const name = cleaned
    .split(' ')
    .slice(0, 5) // Max 5 words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return name || 'New Workflow';
}

/**
 * Extract parameters from natural language intent
 */
function extractParams(intent) {
  const params = {};

  // Extract URL
  const urlMatch = intent.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) {
    params.url = urlMatch[1];
  }

  // Extract cron patterns
  if (intent.match(/daily|every\s+day/i)) {
    params.cron = '0 9 * * *'; // 9am daily
  } else if (intent.match(/hourly|every\s+hour/i)) {
    params.cron = '0 * * * *'; // Every hour
  } else if (intent.match(/weekly|every\s+week/i)) {
    params.cron = '0 9 * * 1'; // Monday 9am
  } else if (intent.match(/every\s+(\d+)\s+minutes/i)) {
    const min = intent.match(/every\s+(\d+)\s+minutes/i)[1];
    params.cron = `*/${min} * * * *`;
  }

  // Extract email addresses
  const emailMatch = intent.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) {
    params.email = emailMatch[0];
  }

  // Extract HTTP method
  if (intent.match(/\bPOST\b/i)) params.httpMethod = 'POST';
  if (intent.match(/\bGET\b/i)) params.httpMethod = 'GET';
  if (intent.match(/\bPUT\b/i)) params.httpMethod = 'PUT';
  if (intent.match(/\bDELETE\b/i)) params.httpMethod = 'DELETE';

  return params;
}
