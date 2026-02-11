const express = require('express');
const path = require('path');
const { Client: PgClient } = require('pg');
const { createClient: createRedisClient } = require('redis');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const DockerServiceDiscovery = require('./src/discovery/docker-discovery');
const EnvironmentLoader = require('./src/config/env-loader');
const themeSettings = require('./src/api/theme-settings');
// DeepKit Fabric: shared auth, logging, metrics, event bus
const fabric = require('deepkit-fabric');
const { DeepKitEventBus, deepkitAuth, structuredLogger, metricsMiddleware, metricsEndpoint } = fabric;

const app = express();
const PORT = parseInt(process.env.PORT || '7777', 10);
const IS_DOCKER = process.env.NODE_ENV === 'production';

// Initialize Event Bus (now from shared fabric library)
const eventBus = new DeepKitEventBus('hub');
global.recentEvents = [];

async function initEventBus() {
    await eventBus.connect();
    await eventBus.subscribe('FIREHOSE', (msg) => {
        console.log('🔥 HUB RECEIVED:', msg.event);
        global.recentEvents.unshift(msg);
        if (global.recentEvents.length > 50) global.recentEvents.pop();
    });
}
initEventBus();

// Fabric middleware: structured logging, metrics, auth
app.use(structuredLogger);
app.use(metricsMiddleware);
app.use(express.json());
app.use(deepkitAuth);

// Prometheus metrics endpoint
app.get('/metrics', metricsEndpoint);

// Serve static files from the built frontend
app.use(express.static(path.join(__dirname, 'public/dist')));
// ...
// --- Event Bus API ---
app.get('/api/events/recent', (req, res) => {
    res.json(global.recentEvents || []);
});

// Discovery initialization
const discovery = new DockerServiceDiscovery();
let discoveredServices = [];

// Fallback data (Old DOCKER_HOSTS and SERVICES combined)
function getFallbackServices() {
  const defaults = {
    // THE FACE (3000-3999)
    'chat': { port: 3001, healthPath: '/health', type: 'http', container: 'deepkit-chat' },
    'research': { port: 3002, healthPath: '/health', type: 'http', container: 'deepkit-research' },
    'content': { port: 3003, healthPath: '/health', type: 'http', container: 'deepkit-content' },
    'crm': { port: 3004, healthPath: '/health', type: 'http', container: 'deepkit-sales' },
    'pdf': { port: 3005, healthPath: '/health', type: 'http', container: 'deepkit-docs' },
    'marketing360': { port: 7712, healthPath: '/health', type: 'http', container: 'deepkit-marketing360' },
    'calendar': { port: 7714, healthPath: '/health', type: 'http', container: 'deepkit-calendar' },
    'invoicing': { port: 7715, healthPath: '/health', type: 'http', container: 'deepkit-invoicing' },
    'password-manager': { port: 7716, healthPath: '/health', type: 'http', container: 'deepkit-password-manager' },
    'api-testing': { port: 7717, healthPath: '/health', type: 'http', container: 'deepkit-api-testing' },
    'task-tracker': { port: 7718, healthPath: '/health', type: 'http', container: 'deepkit-task-tracker' },
    'time-tracker': { port: 7719, healthPath: '/health', type: 'http', container: 'deepkit-time-tracker' },
    'file-manager': { port: 7720, healthPath: '/health', type: 'http', container: 'deepkit-file-manager' },
    'webhook-manager': { port: 7721, healthPath: '/health', type: 'http', container: 'deepkit-webhook-manager' },
    'super-admin': { port: 7722, healthPath: '/health', type: 'http', container: 'deepkit-super-admin' },
    'request-tracker': { port: 3023, healthPath: '/health', type: 'http', container: 'deepkit-request-tracker' },
    'link-shortener': { port: 3013, healthPath: '/health', type: 'http', container: 'link-shortener' },
    'champmail': { port: 3025, healthPath: '/health', type: 'http', container: 'champmail' },
    'cowork': { port: 3030, healthPath: '/health', type: 'http', container: 'cowork' },

    // THE ENGINE (5000-5999)
    'automation': { port: 5678, healthPath: '/healthz', type: 'http', container: 'deepkit-orchestrator' },

    // THE VAULT (6000-7999)
    'memory': { port: 3011, healthPath: '/health', type: 'http', container: 'deepkit-memory' },
    'vector': { port: 6333, healthPath: '/readyz', type: 'http', container: 'deepkit-vector' },

    // THE BRAIN (11000+)
    'ollama': { port: 11434, healthPath: '/api/tags', type: 'http', container: 'deepkit-engine' },

    // MONITORING
    'pulse': { port: 9002, healthPath: '/', type: 'http', container: 'deepkit-pulse' },
    'admin-db': { port: 9003, healthPath: '/', type: 'http', container: 'deepkit-data' },

    // CORE INFRASTRUCTURE (TCP services)
    'postgres': { port: 5432, type: 'tcp', container: 'deepkit-store' },
    'redis': { port: 6379, type: 'tcp', container: 'deepkit-cache' },
    'neo4j': { port: 6380, type: 'tcp', container: 'deepkit-graph' }
  };

  return Object.entries(defaults).map(([name, config]) => ({
    id: name,
    name: name,
    containerName: config.container,
    port: config.port,
    healthPath: config.healthPath,
    type: config.type,
    zone: 'UNKNOWN', // Fallback zone
    status: 'UNKNOWN'
  }));
}

async function initializeDiscovery() {
  try {
    const services = await discovery.discoverServices();
    if (services.length > 0) {
      discoveredServices = services;
      console.log(`✅ Discovered ${discoveredServices.length} DeepKit services`);
      await discovery.startEventListener();
    } else {
      console.warn('⚠️  No services discovered via Docker. Using fallback.');
      discoveredServices = getFallbackServices();
    }
  } catch (error) {
    console.error('❌ Service discovery failed:', error.message);
    discoveredServices = getFallbackServices();
  }
}

// Call on server start
initializeDiscovery();

// Helper: Get service hostname (Docker service name or localhost)
function getServiceHost(service) {
  if (IS_DOCKER) {
    return service.containerName || 'localhost';
  }
  return 'localhost';
}

// Health check for HTTP services
async function checkHttpService(service) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const host = getServiceHost(service);
    const url = `http://${host}:${service.port}${service.healthPath}`;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);

    return {
      name: service.name,
      port: service.port,
      status: response.ok ? 'ONLINE' : 'ERROR',
      healthy: response.ok,
      responseTime: Date.now(),
      type: service.type,
      zone: service.zone
    };
  } catch (error) {
    return {
      name: service.name,
      port: service.port,
      status: 'OFFLINE',
      healthy: false,
      error: error.message,
      type: service.type,
      zone: service.zone
    };
  }
}

// Health check for PostgreSQL
async function checkPostgres(service) {
  const host = getServiceHost(service);
  const client = new PgClient({
    host,
    port: service.port,
    user: process.env.POSTGRES_USER || 'deepkit',
    password: process.env.POSTGRES_PASSWORD || 'deepkit',
    database: 'postgres',
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW()');
    await client.end();

    return {
      name: service.name,
      port: service.port,
      status: 'ONLINE',
      healthy: true,
      type: 'tcp',
      zone: service.zone,
      data: { timestamp: result.rows[0].now }
    };
  } catch (error) {
    return {
      name: service.name,
      port: service.port,
      status: 'OFFLINE',
      healthy: false,
      error: error.message,
      type: 'tcp',
      zone: service.zone
    };
  }
}

// Health check for Redis
async function checkRedis(service) {
  const host = getServiceHost(service);
  const redisOpts = {
    socket: {
      host,
      port: service.port,
      connectTimeout: 3000
    }
  };
  if (process.env.REDIS_PASSWORD) {
    redisOpts.password = process.env.REDIS_PASSWORD;
  }
  const client = createRedisClient(redisOpts);

  try {
    await client.connect();
    const pong = await client.ping();
    await client.quit();

    return {
      name: service.name,
      port: service.port,
      status: 'ONLINE',
      healthy: true,
      type: 'tcp',
      zone: service.zone,
      data: { ping: pong }
    };
  } catch (error) {
    return {
      name: service.name,
      port: service.port,
      status: 'OFFLINE',
      healthy: false,
      error: error.message,
      type: 'tcp',
      zone: service.zone
    };
  }
}

// Health check for Neo4j (TCP connection test)
async function checkNeo4j(service) {
  const net = require('net');
  const host = getServiceHost(service);

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(3000);

    socket.on('connect', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({
          name: service.name,
          port: service.port,
          status: 'ONLINE',
          healthy: true,
          type: 'tcp',
          zone: service.zone
        });
      }
    });

    socket.on('error', (error) => {
      if (!isResolved) {
        isResolved = true;
        resolve({
          name: service.name,
          port: service.port,
          status: 'OFFLINE',
          healthy: false,
          error: error.message,
          type: 'tcp',
          zone: service.zone
        });
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({
          name: service.name,
          port: service.port,
          status: 'OFFLINE',
          healthy: false,
          error: 'Connection timeout',
          type: 'tcp',
          zone: service.zone
        });
      }
    });

    socket.connect(service.port, host);
  });
}

// Helper: Get CPU usage
async function getCPUUsage() {
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  // Wait 100ms and measure again
  await new Promise(resolve => setTimeout(resolve, 100));

  const cpus2 = os.cpus();
  let totalIdle2 = 0, totalTick2 = 0;

  cpus2.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick2 += cpu.times[type];
    }
    totalIdle2 += cpu.times.idle;
  });

  const idle = totalIdle2 - totalIdle;
  const total = totalTick2 - totalTick;
  const usage = 100 - ~~(100 * idle / total);

  return usage;
}

// Hardware metrics endpoint
app.get('/api/hardware/metrics', async (req, res) => {
  try {
    // CPU usage
    const cpuUsage = await getCPUUsage();

    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;

    // GPU usage (if available)
    let gpuUsage = 0;
    try {
      if (process.platform === 'darwin') {
        // macOS GPU detection - fallback to 0 if not available
        gpuUsage = 0;
      } else if (process.platform === 'linux') {
        // Linux nvidia-smi
        const { stdout } = await execPromise('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits');
        gpuUsage = parseFloat(stdout.trim()) || 0;
      }
    } catch (e) {
      gpuUsage = 0; // GPU not available
    }

    res.json({
      cpu: Math.round(cpuUsage),
      memory: Math.round(memUsage),
      gpu: Math.round(gpuUsage),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backend API: Check all services
app.get('/api/services/health', async (req, res) => {
  const checks = discoveredServices.map(service => {
    if (service.type === 'http') {
      return checkHttpService(service);
    } else if (service.name === 'postgres') {
      return checkPostgres(service);
    } else if (service.name === 'redis') {
      return checkRedis(service);
    } else if (service.name === 'neo4j') {
      return checkNeo4j(service);
    } else {
       // Default unknown type or just basic port check if we wanted, but for now skip
       return Promise.resolve({
         name: service.name,
         port: service.port,
         status: 'UNKNOWN',
         healthy: false,
         error: 'Unknown service type',
         type: service.type,
         zone: service.zone
       });
    }
  });

  const results = await Promise.all(checks);

  // Filter to show only healthy services in the dashboard
  // Include optional query param to show all: ?all=true
  const showAll = req.query.all === 'true';
  const filteredResults = showAll ? results : results.filter(r => r.healthy);

  res.json({
    timestamp: new Date().toISOString(),
    services: filteredResults,
    summary: {
      total: results.length,
      online: results.filter(r => r.healthy).length,
      offline: results.filter(r => !r.healthy).length
    }
  });
});

// Backend API: Check single service
app.get('/api/services/:name/health', async (req, res) => {
  const { name } = req.params;
  const service = discoveredServices.find(s => s.name === name);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  let result;
  if (service.type === 'http') {
    result = await checkHttpService(service);
  } else if (service.name === 'postgres') {
    result = await checkPostgres(service);
  } else if (service.name === 'redis') {
    result = await checkRedis(service);
  } else if (service.name === 'neo4j') {
    result = await checkNeo4j(service);
  } else {
    result = {
      name: service.name,
      port: service.port,
      status: 'UNKNOWN',
      healthy: false,
      error: 'Unknown service type',
      type: service.type,
      zone: service.zone
    };
  }

  res.json(result);
});

// Backend API: Get service stats (proxied)
app.get('/api/services/:name/stats', async (req, res) => {
  const { name } = req.params;
  const service = discoveredServices.find(s => s.name === name);

  if (!service || service.type !== 'http') {
    return res.status(404).json({ error: 'Service not found or does not support stats' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const host = getServiceHost(service);
    const url = `http://${host}:${service.port}/api/stats`;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      res.status(response.status).json({ error: 'Stats endpoint returned error' });
    }
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

// Port Scanner: Check for port conflicts
app.get('/api/ports/scan', async (req, res) => {
  const conflicts = [];
  
  // Group by port
  const portMap = {};
  discoveredServices.forEach(service => {
    if (!portMap[service.port]) {
      portMap[service.port] = [];
    }
    portMap[service.port].push(service.name);
  });

  // Find conflicts (multiple services on same port)
  for (const [port, serviceNames] of Object.entries(portMap)) {
    if (serviceNames.length > 1) {
      conflicts.push({
        port: parseInt(port),
        services: serviceNames,
        severity: 'high'
      });
    }
  }

  res.json({
    conflicts,
    total: conflicts.length,
    timestamp: new Date().toISOString()
  });
});

// Port Scanner: Suggest available ports
app.get('/api/ports/suggest', async (req, res) => {
  const usedPorts = discoveredServices.map(s => s.port);
  const suggestions = [];

  // Suggest ports in THE FACE range (3000-3999)
  for (let port = 3001; port < 4000; port++) {
    if (!usedPorts.includes(port)) {
      suggestions.push(port);
      if (suggestions.length >= 10) break; // Return 10 suggestions
    }
  }

  res.json({
    suggestions,
    count: suggestions.length
  });
});

// API: Discover Services (Force refresh)
app.get('/api/services/discover', async (req, res) => {
  const services = await discovery.discoverServices();
  discoveredServices = services;
  res.json({ total: services.length, services });
});

// API: Get container details
app.get('/api/services/:name/container', async (req, res) => {
  const { name } = req.params;
  const service = discoveredServices.find(s => s.id === name || s.name === name);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const details = await discovery.inspectContainer(service.containerName);
  res.json(details);
});

// API: Get container logs
app.get('/api/services/:name/logs', async (req, res) => {
  const { name } = req.params;
  const tail = parseInt(req.query.tail || '50', 10);

  const service = discoveredServices.find(s => s.id === name || s.name === name);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const logs = await discovery.getContainerLogs(service.containerName, tail);
  res.json({ logs });
});

// --- Environment API ---

const envLoader = new EnvironmentLoader(
  IS_DOCKER ? '/app/config/environment-registry.json' : path.join(__dirname, '../../config/environment-registry.json'),
  IS_DOCKER ? '/app/.env' : path.join(__dirname, '../../.env')
);

// Initialize theme settings table
themeSettings.initThemeSettings();

app.get('/api/theme/settings', async (req, res) => {
  try {
    const userId = req.query.user_id || 'default';
    const settings = await themeSettings.getThemeSettings(userId);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/theme/settings', async (req, res) => {
  try {
    const userId = req.body.user_id || 'default';
    const settings = await themeSettings.saveThemeSettings(userId, req.body);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config/env/status', (req, res) => {
  try {
    envLoader.load();
    const validation = envLoader.validate();
    const missing = envLoader.getRequired();

    res.json({
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      missingRequired: missing
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/env/generate', async (req, res) => {
  try {
    const { variables } = req.body;
    if (!variables || !Array.isArray(variables)) {
      return res.status(400).json({ error: 'variables array is required' });
    }

    envLoader.load();
    const fs = require('fs');
    const envPath = envLoader.envPath;
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    const generated = {};

    for (const varName of variables) {
      // Find spec
      let spec = null;
      for (const category of Object.values(envLoader.validator.registry.categories)) {
        if (category.variables[varName]) {
          spec = category.variables[varName];
          break;
        }
      }

      if (spec && spec.generateOnInstall) {
        const secret = envLoader.validator.generateSecret(spec);
        generated[varName] = secret;
        
        // Update or append
        const regex = new RegExp(`^${varName}=.*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `${varName}=${secret}`);
        } else {
          content += `\n${varName}=${secret}`;
        }
      }
    }

    fs.writeFileSync(envPath, content);
    res.json({ success: true, generated: Object.keys(generated) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Backup Monitoring API ---
app.get('/api/backups/status', async (req, res) => {
  try {
    const fs = require('fs');
    const backupDir = IS_DOCKER ? '/var/lib/deepkit/backups' : path.join(__dirname, '../../backups');

    // Check if backup directory exists
    if (!fs.existsSync(backupDir)) {
      return res.json({
        enabled: false,
        lastBackup: null,
        backupCount: 0,
        totalSize: 0,
        status: 'NO_BACKUPS',
        message: 'Backup directory does not exist'
      });
    }

    // Find all backup files
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('deepkit-') && file.endsWith('.sql.gz'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        stats: fs.statSync(path.join(backupDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime); // Most recent first

    if (backupFiles.length === 0) {
      return res.json({
        enabled: true,
        lastBackup: null,
        backupCount: 0,
        totalSize: 0,
        status: 'NO_BACKUPS',
        message: 'No backups found'
      });
    }

    // Calculate total size
    const totalSize = backupFiles.reduce((sum, file) => sum + file.stats.size, 0);
    const lastBackup = backupFiles[0];
    const lastBackupTime = lastBackup.stats.mtime;
    const hoursSinceLastBackup = (Date.now() - lastBackupTime.getTime()) / (1000 * 60 * 60);

    // Determine status
    let status = 'HEALTHY';
    let message = 'Backups running normally';

    if (hoursSinceLastBackup > 8) {
      status = 'WARNING';
      message = `Last backup was ${Math.round(hoursSinceLastBackup)} hours ago`;
    }

    if (hoursSinceLastBackup > 24) {
      status = 'CRITICAL';
      message = `No backup in ${Math.round(hoursSinceLastBackup)} hours!`;
    }

    res.json({
      enabled: true,
      lastBackup: {
        timestamp: lastBackupTime.toISOString(),
        filename: lastBackup.name,
        size: lastBackup.stats.size,
        sizeMB: (lastBackup.stats.size / (1024 * 1024)).toFixed(2),
        hoursAgo: hoursSinceLastBackup.toFixed(1)
      },
      backupCount: backupFiles.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      status,
      message,
      retentionDays: 7,
      interval: '6 hours'
    });
  } catch (error) {
    res.status(500).json({
      enabled: false,
      error: error.message,
      status: 'ERROR'
    });
  }
});

// Hub health check (enriched via fabric - checks DB, Redis, reports uptime)
app.get('/health', fabric.healthEndpoint({
  dependencies: [
    {
      name: 'database',
      check: async () => {
        const client = new PgClient({
          host: process.env.POSTGRES_HOST || 'deepkit-store',
          port: 5432,
          user: process.env.POSTGRES_USER || 'deepkit',
          password: process.env.POSTGRES_PASSWORD,
          database: 'hubconfig',
          connectionTimeoutMillis: 2000
        });
        try { await client.connect(); await client.query('SELECT 1'); await client.end(); return true; }
        catch { return false; }
      }
    },
    {
      name: 'event_bus',
      check: async () => !!eventBus
    }
  ]
}));

// Serve frontend for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public/dist/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 DeepKit Hub running on port ${PORT}`);
  console.log(`🔗 Open: http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`📊 API: http://localhost:${PORT}/api/services/health`);
  console.log(`🐳 Mode: ${IS_DOCKER ? 'Docker' : 'Development'}`);
});