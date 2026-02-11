/**
 * docker_discovery - Service discovery and health checking via Docker API
 * Wraps DockerServiceDiscovery for LLM tool calling
 */

// Import will be resolved at runtime when the tool is loaded
let DockerServiceDiscovery;
try {
  DockerServiceDiscovery = require('../../discovery/docker-discovery');
} catch (e) {
  DockerServiceDiscovery = null;
}

// Singleton discovery instance
let discoveryInstance = null;

function getDiscovery() {
  if (!discoveryInstance && DockerServiceDiscovery) {
    discoveryInstance = new DockerServiceDiscovery();
  }
  return discoveryInstance;
}

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'docker_discovery',
      description: 'Discover and check health of DeepKit services via Docker. Use when the user asks about services, what\'s running, container status, or service health.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'health', 'logs'],
            description: 'Operation: list services, check health of all services, or get logs from a specific service'
          },
          service: {
            type: 'string',
            description: 'Service name (required for logs action)'
          },
          tail: {
            type: 'number',
            description: 'Number of log lines to retrieve (default: 50)'
          }
        },
        required: ['action']
      }
    }
  },

  execute: async (args, context) => {
    const { action, service, tail = 50 } = args;
    const discovery = getDiscovery();

    if (!discovery) {
      return {
        success: false,
        error: 'Docker discovery not available.',
        type: 'service_grid',
        data: {
          services: [],
          count: 0,
          dockerAvailable: false
        }
      };
    }

    try {
      switch (action) {
        case 'list': {
          const services = await discovery.discoverServices();
          return {
            success: true,
            type: 'service_grid',
            data: {
              services,
              count: services.length,
              dockerAvailable: discovery.isAvailable()
            },
            message: `Found ${services.length} DeepKit service(s)`
          };
        }

        case 'health': {
          const services = await discovery.checkAllHealth();
          const healthy = services.filter(s => s.health === 'healthy').length;
          const unhealthy = services.filter(s => s.health !== 'healthy').length;

          return {
            success: true,
            type: 'service_grid',
            data: {
              services,
              count: services.length,
              healthy,
              unhealthy,
              dockerAvailable: discovery.isAvailable()
            },
            message: `${healthy} healthy, ${unhealthy} issues across ${services.length} services`
          };
        }

        case 'logs': {
          if (!service) {
            return {
              success: false,
              error: 'Service name is required for logs action.',
              type: 'note',
              data: {
                action: 'found',
                message: 'Please specify which service to get logs from.'
              }
            };
          }

          const logs = await discovery.getContainerLogs(service, tail);

          return {
            success: true,
            type: 'note',
            data: {
              action: 'found',
              note: {
                id: `logs-${service}-${Date.now()}`,
                title: `Logs: ${service}`,
                content: logs || 'No logs available.',
                created_at: new Date().toISOString()
              }
            },
            message: `Retrieved ${tail} lines of logs from ${service}`
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Use list, health, or logs.`,
            type: 'note',
            data: {
              action: 'found',
              message: `Unknown action: ${action}`
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Docker discovery error: ${error.message}`,
        type: 'note',
        data: {
          action: 'found',
          note: {
            id: 'error',
            title: 'Error',
            content: `Docker discovery failed: ${error.message}`
          }
        }
      };
    }
  }
};
