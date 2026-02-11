/**
 * Docker Service Discovery
 * Discovers DeepKit services via Docker API
 * Ported from Hub to Core for unified service management
 */

let Docker;
try {
  Docker = require('dockerode');
} catch (e) {
  Docker = null;
}

class DockerServiceDiscovery {
  constructor() {
    this.docker = Docker ? new Docker({ socketPath: '/var/run/docker.sock' }) : null;
    this.services = new Map();
    this.eventStream = null;
    this.lastDiscovery = null;
    this.cacheMaxAge = 30000; // 30 seconds
  }

  /**
   * Check if Docker is available
   */
  isAvailable() {
    return this.docker !== null;
  }

  /**
   * Discover all running DeepKit services
   */
  async discoverServices(forceRefresh = false) {
    if (!this.docker) {
      return this.getFallbackServices();
    }

    // Use cache if fresh enough
    if (!forceRefresh && this.lastDiscovery && Date.now() - this.lastDiscovery < this.cacheMaxAge) {
      return Array.from(this.services.values());
    }

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

      this.lastDiscovery = Date.now();
      return Array.from(this.services.values());
    } catch (error) {
      console.error('[DockerDiscovery] Discovery error:', error.message);
      return this.getFallbackServices();
    }
  }

  /**
   * Parse service metadata from container labels
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
    const zone = labels['deepkit.service.zone'] || this.inferZone(serviceName, port);

    return {
      id: serviceName,
      name: this.formatServiceName(serviceName),
      containerName: containerInfo.Names[0].substring(1), // Remove leading /
      containerId: containerInfo.Id.slice(0, 12),
      port,
      healthPath,
      type,
      zone,
      state: containerInfo.State,
      status: containerInfo.Status,
      created: containerInfo.Created,
      image: containerInfo.Image,
      healthy: containerInfo.State === 'running'
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
    return 3000;
  }

  /**
   * Infer zone from service name or port
   */
  inferZone(serviceName, port) {
    const lowerName = serviceName.toLowerCase();

    if (port >= 5000 && port <= 5999) return 'ENGINE';
    if (port >= 6000 && port <= 7999) return 'VAULT';
    if (port >= 9000 && port <= 9999) return 'MONITOR';
    if (port >= 11000) return 'BRAIN';

    if (lowerName.includes('postgres') || lowerName.includes('redis') || lowerName.includes('maria')) return 'VAULT';
    if (lowerName.includes('n8n') || lowerName.includes('automation')) return 'ENGINE';
    if (lowerName.includes('ollama') || lowerName.includes('llm')) return 'BRAIN';
    if (lowerName.includes('grafana') || lowerName.includes('prometheus')) return 'MONITOR';

    return 'FACE';
  }

  /**
   * Format service name for display
   */
  formatServiceName(name) {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Check health of a specific service
   */
  async checkHealth(service) {
    if (service.type !== 'http') {
      return { healthy: service.state === 'running', message: 'Non-HTTP service' };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const url = `http://localhost:${service.port}${service.healthPath}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      clearTimeout(timeout);
      return { healthy: response.ok, status: response.status };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }

  /**
   * Check health of all discovered services
   */
  async checkAllHealth() {
    const services = await this.discoverServices();
    const results = await Promise.all(
      services.map(async (service) => ({
        ...service,
        health: await this.checkHealth(service)
      }))
    );
    return results;
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerName, tail = 50) {
    if (!this.docker) {
      return 'Docker not available';
    }

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
      console.error(`[DockerDiscovery] Failed to get logs for ${containerName}:`, error.message);
      return `Error retrieving logs: ${error.message}`;
    }
  }

  /**
   * Fallback services when Docker is unavailable
   */
  getFallbackServices() {
    return [
      { id: 'deepkit-core', name: 'DeepKit Core', port: 7777, zone: 'FACE', healthy: true, type: 'http' },
      { id: 'postgres', name: 'PostgreSQL', port: 5432, zone: 'VAULT', healthy: null, type: 'tcp' },
      { id: 'redis', name: 'Redis', port: 6379, zone: 'VAULT', healthy: null, type: 'tcp' },
      { id: 'ollama', name: 'Ollama', port: 11434, zone: 'BRAIN', healthy: null, type: 'http' },
      { id: 'n8n', name: 'n8n', port: 5678, zone: 'ENGINE', healthy: null, type: 'http' },
    ];
  }

  /**
   * Start listening for Docker events (container start/stop)
   */
  async startEventListener(onServiceChange) {
    if (!this.docker) return;

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
          if (['start', 'stop', 'die', 'restart'].includes(event.Action)) {
            await this.discoverServices(true);
            if (onServiceChange) {
              onServiceChange(Array.from(this.services.values()));
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
    } catch (error) {
      console.error('[DockerDiscovery] Failed to start event listener:', error.message);
    }
  }

  /**
   * Stop event listener
   */
  stopEventListener() {
    if (this.eventStream) {
      this.eventStream.destroy();
      this.eventStream = null;
    }
  }
}

module.exports = DockerServiceDiscovery;
