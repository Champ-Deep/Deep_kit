const axios = require('axios');

/**
 * n8n_trigger - Trigger automation workflows via n8n (THE ENGINE)
 *
 * Fires webhook-based n8n workflows with optional data payload.
 */
module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'n8n_trigger',
      description: 'Trigger an automation workflow in n8n (THE ENGINE). Use this to run predefined automations, send notifications, process data, or execute any n8n workflow via its webhook path.',
      parameters: {
        type: 'object',
        properties: {
          workflow: {
            type: 'string',
            description: 'Workflow webhook path or name (e.g., "send-notification", "/my-workflow")'
          },
          data: {
            type: 'object',
            description: 'Input data to pass to the workflow'
          }
        },
        required: ['workflow']
      }
    }
  },

  /**
   * Execute n8n workflow trigger
   * @param {object} args - { workflow, data }
   * @param {object} context - { userId, channel }
   */
  execute: async (args, context) => {
    const { workflow, data = {} } = args;
    const n8nBaseURL = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678';

    // Build webhook URL
    let webhookUrl;
    if (workflow.startsWith('http')) {
      webhookUrl = workflow;
    } else if (workflow.startsWith('/')) {
      webhookUrl = `${n8nBaseURL}/webhook${workflow}`;
    } else {
      webhookUrl = `${n8nBaseURL}/webhook/${workflow}`;
    }

    try {
      const response = await axios.post(
        webhookUrl,
        {
          ...data,
          _source: 'deepkit-messenger',
          _user: context.userId || 'unknown',
          _channel: context.channel || 'api',
          _timestamp: new Date().toISOString()
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return {
        success: true,
        workflow,
        status: response.status,
        response_data: response.data,
        message: `Workflow "${workflow}" triggered successfully`
      };

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          workflow,
          error: 'THE ENGINE (n8n) is offline or unreachable',
          suggestion: 'Check if n8n is running on the DeepKit network'
        };
      }

      if (error.response?.status === 404) {
        return {
          success: false,
          workflow,
          error: `Workflow "${workflow}" not found`,
          suggestion: 'Verify the webhook path in n8n'
        };
      }

      return {
        success: false,
        workflow,
        error: error.message,
        status_code: error.response?.status
      };
    }
  }
};
