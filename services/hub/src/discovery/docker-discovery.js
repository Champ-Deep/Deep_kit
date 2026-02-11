const Docker = require('dockerode');

class DockerServiceDiscovery {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.services = new Map();
    this.eventStream = null;
  }

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

    return {
      id: serviceName,
      name: serviceName,
      containerName: containerInfo.Names[0].substring(1), // Remove leading /
      containerId: containerInfo.Id,
      port,
      healthPath,
      type,
      zone,
      state: containerInfo.State,
      status: containerInfo.Status,
      created: containerInfo.Created,
      image: containerInfo.Image
    };
  }

  extractPortFromContainer(containerInfo) {
    // Parse port from container port mappings
    const ports = containerInfo.Ports || [];
    if (ports.length > 0) {
      return ports[0].PublicPort || ports[0].PrivatePort;
    }
    return 3000; // Default fallback
  }

  async startEventListener() {
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

          // Refresh services on start/stop/die events
          if (['start', 'stop', 'die', 'restart'].includes(event.Action)) {
            await this.discoverServices();
          }
        } catch (e) {
          console.error('Error parsing docker event:', e);
        }
      });
    } catch (error) {
      console.error('Failed to start docker event listener:', error.message);
    }
  }

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

  async inspectContainer(containerName) {
    try {
      const container = this.docker.getContainer(containerName);
      return await container.inspect();
    } catch (error) {
      console.error(`Failed to inspect ${containerName}:`, error.message);
      return { error: error.message };
    }
  }
}

module.exports = DockerServiceDiscovery;
