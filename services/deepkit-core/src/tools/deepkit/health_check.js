const axios = require('axios');

/**
 * health_check - Check health status of DeepKit Arsenal services
 *
 * Queries service endpoints to verify operational status.
 */
module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'health_check',
      description: 'Check the health status of DeepKit Arsenal services. Returns which services are online or offline. Use when asked about system status, service health, or if something is running.',
      parameters: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            enum: ['all', 'ollama', 'postgres', 'n8n', 'messenger'],
            description: 'Which service to check (default: all)'
          }
        }
      }
    }
  },

  /**
   * Execute health check
   * @param {object} args - { service }
   * @param {object} context - { storage }
   */
  execute: async (args, context) => {
    const { service = 'all' } = args;
    const { storage } = context;

    const checks = {
      ollama: {
        name: 'THE BRAIN (Ollama)',
        check: async () => {
          const url = process.env.OLLAMA_BASE_URL || 'http://deepkit-engine:11434';
          const resp = await axios.get(`${url}/api/tags`, { timeout: 5000 });
          const models = resp.data.models?.map(m => m.name) || [];
          return { healthy: true, models };
        }
      },
      postgres: {
        name: 'THE VAULT (Postgres)',
        check: async () => {
          if (!storage) return { healthy: false, error: 'Storage not initialized' };
          const connected = await storage.testConnection();
          return { healthy: connected };
        }
      },
      n8n: {
        name: 'THE ENGINE (n8n)',
        check: async () => {
          const url = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678';
          await axios.get(`${url}/healthz`, { timeout: 5000 });
          return { healthy: true };
        }
      },
      messenger: {
        name: 'THE PROXY (Messenger)',
        check: async () => {
          return {
            healthy: true,
            uptime: Math.floor(process.uptime()),
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
          };
        }
      }
    };

    const servicesToCheck = service === 'all'
      ? Object.keys(checks)
      : [service];

    const results = {};

    for (const svcName of servicesToCheck) {
      const svc = checks[svcName];
      if (!svc) {
        results[svcName] = { name: svcName, status: 'unknown', error: 'Unknown service' };
        continue;
      }

      try {
        const result = await svc.check();
        results[svcName] = {
          name: svc.name,
          status: result.healthy ? 'healthy' : 'unhealthy',
          ...result
        };
      } catch (error) {
        results[svcName] = {
          name: svc.name,
          status: 'unhealthy',
          error: error.code === 'ECONNREFUSED' ? 'Connection refused' : error.message
        };
      }
    }

    const statuses = Object.values(results);
    const healthyCount = statuses.filter(s => s.status === 'healthy').length;
    const totalCount = statuses.length;

    return {
      success: true,
      summary: `${healthyCount}/${totalCount} services healthy`,
      services: results,
      timestamp: new Date().toISOString(),
      message: healthyCount === totalCount
        ? 'All Arsenal services are operational.'
        : `${healthyCount} of ${totalCount} services are online. Some services are down.`
    };
  }
};
