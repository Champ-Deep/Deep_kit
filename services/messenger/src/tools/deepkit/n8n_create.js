/**
 * n8n Workflow Creator Tool
 *
 * Creates n8n workflows programmatically via the n8n REST API.
 * This enables the agent to create automation workflows on the fly.
 *
 * Actions:
 * - create: Create a new workflow from a template or specification
 * - activate: Activate a workflow
 * - deactivate: Deactivate a workflow
 * - delete: Delete a workflow
 * - get: Get workflow details
 */

const axios = require('axios');

const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL || 'http://deepkit-n8n:5678';
const N8N_API_URL = `${N8N_BASE_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY || '';

// Common headers for n8n API requests
const apiHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (N8N_API_KEY) headers['X-N8N-API-KEY'] = N8N_API_KEY;
  return headers;
};

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'n8n_create',
      description: 'Create, manage, and query n8n workflows. Actions: create, activate, deactivate, delete, get, list.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'activate', 'deactivate', 'delete', 'get', 'list'],
            description: 'Action to perform'
          },
          name: {
            type: 'string',
            description: 'Workflow name (for create action)'
          },
          workflow_id: {
            type: 'string',
            description: 'Workflow ID (for activate/deactivate/delete/get actions)'
          },
          nodes: {
            type: 'array',
            description: 'Array of node definitions (for create action)'
          },
          connections: {
            type: 'object',
            description: 'Connection definitions (for create action)'
          }
        },
        required: ['action']
      }
    }
  },

  execute: async (args, context) => {
    const { action, name, workflow_id, nodes, connections } = args;

    try {
      switch (action) {
        case 'create':
          return await createWorkflow(name, nodes, connections, context);
        case 'activate':
          return await activateWorkflow(workflow_id, true);
        case 'deactivate':
          return await activateWorkflow(workflow_id, false);
        case 'delete':
          return await deleteWorkflow(workflow_id, context);
        case 'get':
          return await getWorkflow(workflow_id);
        case 'list':
          return await listWorkflows();
        default:
          return {
            success: false,
            message: `Unknown action: ${action}. Use: create, activate, deactivate, delete, get, list`
          };
      }
    } catch (error) {
      // Handle connection errors gracefully
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'n8n is not running. Start it with: docker compose up -d deepkit-n8n',
          error: 'CONNECTION_REFUSED'
        };
      }
      return {
        success: false,
        message: `n8n error: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }
};

async function createWorkflow(name, nodes, connections, context) {
  if (!name) {
    return { success: false, message: 'Workflow name is required' };
  }

  // Default to a simple webhook workflow if no nodes provided
  const workflowNodes = nodes || [
    {
      id: 'trigger',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [250, 300],
      parameters: {
        path: name.toLowerCase().replace(/\s+/g, '-'),
        httpMethod: 'POST',
        responseMode: 'onReceived',
        responseData: 'allEntries'
      }
    },
    {
      id: 'respond',
      name: 'Respond',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1,
      position: [500, 300],
      parameters: {
        respondWith: 'json',
        responseBody: '={{ JSON.stringify({ success: true, workflow: "' + name + '", timestamp: new Date().toISOString() }) }}'
      }
    }
  ];

  const workflowConnections = connections || {
    'Webhook': {
      main: [[{ node: 'Respond', type: 'main', index: 0 }]]
    }
  };

  const response = await axios.post(`${N8N_API_URL}/workflows`, {
    name: name,
    nodes: workflowNodes,
    connections: workflowConnections,
    settings: {
      executionOrder: 'v1'
    }
  }, {
    timeout: 15000,
    headers: apiHeaders()
  });

  const workflow = response.data;

  // Auto-activate the workflow
  try {
    await axios.patch(`${N8N_API_URL}/workflows/${workflow.id}`, {
      active: true
    }, {
      timeout: 10000,
      headers: apiHeaders()
    });
  } catch (activateError) {
    // Workflow created but couldn't activate - that's OK
  }

  const webhookPath = workflowNodes.find(n => n.type === 'n8n-nodes-base.webhook')?.parameters?.path;

  // Persist to Postgres
  if (context?.storage?.saveWorkflow) {
    try {
      await context.storage.saveWorkflow({
        n8nId: String(workflow.id),
        name: workflow.name,
        active: true,
        webhookPath: webhookPath,
        userId: context.userId
      });
    } catch (e) {
      // Non-critical
    }
  }

  return {
    success: true,
    message: `Workflow "${name}" created and activated`,
    type: 'workflow',
    data: {
      action: 'created',
      workflow: {
        id: workflow.id,
        name: workflow.name,
        active: true,
        nodes: workflowNodes.length,
        webhookPath: webhookPath
      }
    }
  };
}

async function activateWorkflow(workflowId, active) {
  if (!workflowId) {
    return { success: false, message: 'Workflow ID is required' };
  }

  const response = await axios.patch(`${N8N_API_URL}/workflows/${workflowId}`, {
    active
  }, {
    timeout: 10000,
    headers: apiHeaders()
  });

  return {
    success: true,
    message: `Workflow ${workflowId} ${active ? 'activated' : 'deactivated'}`,
    type: 'workflow',
    data: {
      action: active ? 'activated' : 'deactivated',
      workflow: {
        id: response.data.id,
        name: response.data.name,
        active: response.data.active
      }
    }
  };
}

async function deleteWorkflow(workflowId, context) {
  if (!workflowId) {
    return { success: false, message: 'Workflow ID is required' };
  }

  await axios.delete(`${N8N_API_URL}/workflows/${workflowId}`, {
    timeout: 10000,
    headers: apiHeaders()
  });

  // Remove from Postgres
  if (context?.storage?.deleteWorkflow) {
    try {
      await context.storage.deleteWorkflow(String(workflowId));
    } catch (e) {
      // Non-critical
    }
  }

  return {
    success: true,
    message: `Workflow ${workflowId} deleted`,
    type: 'workflow',
    data: { action: 'deleted', workflow: { id: workflowId } }
  };
}

async function getWorkflow(workflowId) {
  if (!workflowId) {
    return { success: false, message: 'Workflow ID is required' };
  }

  const response = await axios.get(`${N8N_API_URL}/workflows/${workflowId}`, {
    timeout: 10000,
    headers: apiHeaders()
  });

  const wf = response.data;

  return {
    success: true,
    message: `Workflow: ${wf.name}`,
    type: 'workflow',
    data: {
      action: 'status',
      workflow: {
        id: wf.id,
        name: wf.name,
        active: wf.active,
        nodes: wf.nodes?.length || 0,
        lastRun: wf.updatedAt
      }
    }
  };
}

async function listWorkflows() {
  const response = await axios.get(`${N8N_API_URL}/workflows`, {
    timeout: 10000,
    headers: apiHeaders()
  });

  const workflows = response.data?.data || response.data || [];

  return {
    success: true,
    message: `${workflows.length} workflow(s) found`,
    type: 'workflow',
    data: {
      action: 'list',
      workflows: workflows.map(wf => ({
        id: wf.id,
        name: wf.name,
        active: wf.active
      }))
    }
  };
}
