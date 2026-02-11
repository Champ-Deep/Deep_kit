const Docker = require('dockerode');
const axios = require('axios');

/**
 * DockerServiceDiscovery - Discovers and monitors DeepKit services via Docker
 * Ported from Hub to Messenger (Command Center)
 */
class DockerServiceDiscovery {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.services = new Map();
    this.eventStream = null;
    this.eventCallbacks = [];
  }

  /**
   * Discover all running DeepKit services
   */
  async discoverServices() {
    try {
      const containers = await this.docker.listContainers({
        all: false, // Only running containers
        filters: {
          label: ['com.docker.compose.project=deepkit']
        }
      });

      this.services.clear();

      for (const containerInfo of containers) {
        const service = this.parseServiceMetadata(containerInfo);
        if (service) {
          this.services.set(service.id, service);
        }
      }

      return Array.from(this.services.values());
    } catch (error) {
      console.error('Docker discovery error:', error.message);
      return [];
    }
  }

  /**
   * Parse service metadata from Docker container labels
   */
  parseServiceMetadata(containerInfo) {
    const labels = containerInfo.Labels || {};
    const serviceName = labels['com.docker.compose.service'] ||
                       labels['deepkit.service.name'];

    if (!serviceName) return null;

    // Extract metadata from labels
    const port = parseInt(labels['deepkit.service.port'] ||
                         this.extractPortFromContainer(containerInfo), 10);
    const healthPath = labels['deepkit.health.path'] || '/health';
    const type = labels['deepkit.service.type'] || 'http';
    const zone = labels['deepkit.service.zone'] || 'THE FACE';
    const description = labels['deepkit.service.description'] || serviceName;

    return {
      id: serviceName,
      name: serviceName,
      containerName: containerInfo.Names[0].substring(1), // Remove leading /
      containerId: containerInfo.Id,
      port,
      healthPath,
      type,
      zone,
      description,
      state: containerInfo.State,
      status: containerInfo.Status,
      created: containerInfo.Created,
      image: containerInfo.Image
    };
  }

  /**
   * Extract port from container port mappings
   */
  extractPortFromContainer(containerInfo) {
    const ports = containerInfo.Ports || [];
    if (ports.length > 0) {
      return ports[0].PublicPort || ports[0].PrivatePort;
    }
    return 3000; // Default fallback
  }

  /**
   * Start listening for Docker events (container start/stop/restart)
   */
  async startEventListener(callback) {
    if (callback) {
      this.eventCallbacks.push(callback);
    }

    try {
      this.eventStream = await this.docker.getEvents({
        filters: {
          type: ['container'],
          label: ['com.docker.compose.project=deepkit']
        }
      });

      this.eventStream.on('data', async (chunk) => {
        try {
          const event = JSON.parse(chunk.toString());

          // Refresh services on relevant events
          if (['start', 'stop', 'die', 'restart'].includes(event.Action)) {
            await this.discoverServices();

            // Notify all callbacks
            for (const cb of this.eventCallbacks) {
              try {
                cb({
                  action: event.Action,
                  container: event.Actor?.Attributes?.name,
                  service: event.Actor?.Attributes?.['com.docker.compose.service'],
                  timestamp: new Date(event.time * 1000).toISOString()
                });
              } catch (e) {
                console.error('Event callback error:', e);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing docker event:', e);
        }
      });
    } catch (error) {
      console.error('Failed to start docker event listener:', error.message);
    }
  }

  /**
   * Get logs from a specific container
   */
  async getContainerLogs(containerName, tail = 50) {
    try {
      const container = this.docker.getContainer(containerName);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true
      });
      return logs.toString('utf-8');
    } catch (error) {
      console.error(`Failed to get logs for ${containerName}:`, error.message);
      return `Error retrieving logs: ${error.message}`;
    }
  }

  /**
   * Get detailed container info
   */
  async inspectContainer(containerName) {
    try {
      const container = this.docker.getContainer(containerName);
      return await container.inspect();
    } catch (error) {
      console.error(`Failed to inspect ${containerName}:`, error.message);
      return { error: error.message };
    }
  }

  /**
   * Check health of a specific service by calling its health endpoint
   */
  async checkServiceHealth(service) {
    if (!service || service.type !== 'http') {
      return { status: 'unknown', message: 'Non-HTTP service' };
    }

    const url = `http://${service.containerName}:${service.port}${service.healthPath}`;

    try {
      const response = await axios.get(url, { timeout: 5000 });
      return {
        status: 'healthy',
        statusCode: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get health status of all discovered services
   */
  async getHealthMatrix() {
    const services = await this.discoverServices();
    const matrix = {};

    await Promise.all(
      services.map(async (service) => {
        const health = await this.checkServiceHealth(service);
        matrix[service.id] = {
          ...service,
          health
        };
      })
    );

    return matrix;
  }

  /**
   * Get services grouped by zone
   */
  async getServicesByZone() {
    const services = await this.discoverServices();
    const zones = {};

    for (const service of services) {
      const zone = service.zone || 'THE FACE';
      if (!zones[zone]) {
        zones[zone] = [];
      }
      zones[zone].push(service);
    }

    return zones;
  }

  /**
   * Stop event listener
   */
  stopEventListener() {
    if (this.eventStream) {
      this.eventStream.destroy();
      this.eventStream = null;
    }
    this.eventCallbacks = [];
  }
}

module.exports = { DockerServiceDiscovery };
