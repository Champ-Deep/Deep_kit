const axios = require('axios');

/**
 * arsenal_services - List and manage DeepKit Arsenal services
 *
 * Uses Docker service discovery to get real-time status of all running services.
 * This tool calls the Messenger's own system management APIs.
 */
module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'arsenal_services',
      description: 'List all running DeepKit Arsenal services with their status, ports, and zones. Use when asked to "list services", "show the arsenal", "what\'s running", or "show me all services".',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'health', 'logs', 'zones'],
            description: 'Action to perform: list (all services), health (health matrix), logs (get service logs), zones (group by zone)'
          },
          service: {
            type: 'string',
            description: 'Service name (for logs action)'
          },
          zone: {
            type: 'string',
            description: 'Filter by zone (THE FACE, THE ENGINE, THE VAULT, THE BRAIN, THE MONITOR)'
          }
        }
      }
    }
  },

  execute: async (args, context) => {
    const { action = 'list', service, zone } = args;
    const baseUrl = `http://localhost:${process.env.PORT || 7777}`;

    try {
      switch (action) {
        case 'list': {
          const response = await axios.get(`${baseUrl}/api/services`, { timeout: 10000 });
          const data = response.data;

          let services = data.services;
          if (zone) {
            services = services.filter(s => s.zone === zone);
          }

          const serviceList = services.map(s => ({
            name: s.name,
            port: s.port,
            zone: s.zone,
            status: s.state,
            description: s.description
          }));

          return {
            success: true,
            type: 'service_list',
            count: serviceList.length,
            total: data.total,
            services: serviceList,
            message: `${serviceList.length} service(s) in the Arsenal${zone ? ` (${zone})` : ''}`,
            data: {
              services: serviceList,
              byZone: data.byZone
            }
          };
        }

        case 'health': {
          const response = await axios.get(`${baseUrl}/api/services/health`, { timeout: 30000 });
          const data = response.data;

          const healthy = Object.entries(data.services)
            .filter(([_, s]) => s.health?.status === 'healthy')
            .map(([name, s]) => name);

          const unhealthy = Object.entries(data.services)
            .filter(([_, s]) => s.health?.status !== 'healthy')
            .map(([name, s]) => ({ name, error: s.health?.error }));

          return {
            success: true,
            type: 'health_matrix',
            summary: data.summary,
            healthy,
            unhealthy,
            message: `${data.summary.healthy}/${data.summary.total} services healthy (${data.summary.healthPercent}%)`,
            data: {
              summary: data.summary,
              services: data.services
            }
          };
        }

        case 'logs': {
          if (!service) {
            return {
              success: false,
              error: 'Service name is required for logs action',
              message: 'Please specify a service name. Example: "show logs for deepkit-messenger"'
            };
          }

          const response = await axios.get(`${baseUrl}/api/services/${service}/logs?tail=30`, { timeout: 10000 });
          const data = response.data;

          return {
            success: true,
            type: 'service_logs',
            service,
            logs: data.logs,
            message: `Last 30 lines from ${service}`,
            data: { service, logs: data.logs }
          };
        }

        case 'zones': {
          const response = await axios.get(`${baseUrl}/api/services`, { timeout: 10000 });
          const byZone = response.data.byZone;

          const zoneSummary = Object.entries(byZone).map(([zoneName, services]) => ({
            zone: zoneName,
            count: services.length,
            services: services.map(s => s.name)
          }));

          return {
            success: true,
            type: 'zone_summary',
            zones: zoneSummary,
            message: `${Object.keys(byZone).length} zones: ${zoneSummary.map(z => `${z.zone} (${z.count})`).join(', ')}`,
            data: { zones: byZone }
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
            message: 'Valid actions: list, health, logs, zones'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to query Arsenal: ${error.message}`
      };
    }
  }
};
