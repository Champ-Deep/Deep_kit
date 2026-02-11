import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { ServiceHealth, DockerContainer, DatabaseInfo, SystemStats } from '../types';

const execAsync = promisify(exec);

// DeepKit services configuration
const SERVICES = [
  { name: 'API Testing', port: 3017 },
  { name: 'Calendar', port: 3014 },
  { name: 'Time Tracker', port: 3019 },
  { name: 'File Manager', port: 3020 },
  { name: 'Task Tracker', port: 3018 },
  { name: 'Password Manager', port: 3016 },
  { name: 'Marketing 360', port: 3012 },
  { name: 'Webhook Manager', port: 3021 },
  { name: 'Invoicing', port: 3015 }
];

const DATABASES = [
  { name: 'calendar', type: 'postgresql' as const },
  { name: 'timetracker', type: 'postgresql' as const },
  { name: 'filemanager', type: 'postgresql' as const },
  { name: 'tasktracker', type: 'postgresql' as const },
  { name: 'passwords', type: 'postgresql' as const },
  { name: 'marketing', type: 'postgresql' as const },
  { name: 'webhooks', type: 'postgresql' as const },
  { name: 'invoicing', type: 'postgresql' as const },
  { name: 'api-testing.db', type: 'sqlite' as const }
];

// Service Health Monitoring
export async function checkServiceHealth(service: typeof SERVICES[0]): Promise<ServiceHealth> {
  try {
    const start = Date.now();
    const response = await axios.get(`http://localhost:${service.port}/health`, { timeout: 5000 });
    const uptime = Date.now() - start;

    return {
      name: service.name,
      port: service.port,
      status: response.status === 200 ? 'healthy' : 'unhealthy',
      uptime: `${uptime}ms`,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: service.name,
      port: service.port,
      status: 'unhealthy',
      uptime: null,
      lastCheck: new Date().toISOString()
    };
  }
}

export async function getAllServicesHealth(): Promise<ServiceHealth[]> {
  const healthChecks = await Promise.all(SERVICES.map(checkServiceHealth));
  return healthChecks;
}

// Docker Management
export async function listDockerContainers(): Promise<DockerContainer[]> {
  try {
    const { stdout } = await execAsync(
      'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}|{{.CreatedAt}}"'
    );

    const containers = stdout
      .trim()
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const [id, name, image, status, state, ports, created] = line.split('|');
        return {
          id,
          name,
          image,
          status,
          state,
          ports: ports ? ports.split(',').map(p => p.trim()) : [],
          created
        };
      });

    return containers;
  } catch (error) {
    console.error('Error listing Docker containers:', error);
    return [];
  }
}

export async function startContainer(containerName: string): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync(`docker start ${containerName}`);
    return { success: true, message: `Container ${containerName} started successfully` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function stopContainer(containerName: string): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync(`docker stop ${containerName}`);
    return { success: true, message: `Container ${containerName} stopped successfully` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function restartContainer(containerName: string): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync(`docker restart ${containerName}`);
    return { success: true, message: `Container ${containerName} restarted successfully` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getContainerLogs(containerName: string, lines: number = 100): Promise<string> {
  try {
    const { stdout } = await execAsync(`docker logs ${containerName} --tail ${lines}`);
    return stdout;
  } catch (error: any) {
    return `Error fetching logs: ${error.message}`;
  }
}

// Database Management
export async function getDatabaseInfo(db: typeof DATABASES[0]): Promise<DatabaseInfo> {
  try {
    if (db.type === 'postgresql') {
      // Query PostgreSQL database info
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'postgres',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        database: db.name,
        user: process.env.POSTGRES_USER || 'deepkit',
        password: process.env.POSTGRES_PASSWORD || 'deepkit123',
      });

      try {
        const sizeResult = await pool.query(`
          SELECT pg_size_pretty(pg_database_size($1)) as size
        `, [db.name]);

        const tablesResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_schema = 'public'
        `);

        await pool.end();

        return {
          name: db.name,
          type: db.type,
          size: sizeResult.rows[0].size,
          tables: parseInt(tablesResult.rows[0].count, 10),
          status: 'connected'
        };
      } catch (error) {
        await pool.end();
        throw error;
      }
    } else {
      // SQLite database
      const fs = require('fs');
      const path = `~/.deepkit/${db.name}`;
      try {
        const stats = fs.statSync(path);
        const sizeInBytes = stats.size;
        const size = `${(sizeInBytes / 1024).toFixed(2)} KB`;

        return {
          name: db.name,
          type: db.type,
          size,
          tables: 0, // Would need sqlite3 to query
          status: 'connected'
        };
      } catch (error) {
        return {
          name: db.name,
          type: db.type,
          size: 'Unknown',
          tables: 0,
          status: 'error'
        };
      }
    }
  } catch (error) {
    return {
      name: db.name,
      type: db.type,
      size: 'Error',
      tables: 0,
      status: 'error'
    };
  }
}

export async function getAllDatabasesInfo(): Promise<DatabaseInfo[]> {
  const dbInfos = await Promise.all(DATABASES.map(getDatabaseInfo));
  return dbInfos;
}

// System Stats
export async function getSystemStats(): Promise<SystemStats> {
  try {
    // Get CPU usage
    const { stdout: cpuOutput } = await execAsync('top -bn1 | grep "Cpu(s)"');
    const cpuMatch = cpuOutput.match(/(\d+\.\d+)\s*us/);
    const cpu = cpuMatch ? parseFloat(cpuMatch[1]) : 0;

    // Get memory usage
    const { stdout: memOutput } = await execAsync('free -h');
    const memLines = memOutput.split('\n');
    const memLine = memLines[1].split(/\s+/);
    const memUsed = memLine[2];
    const memTotal = memLine[1];
    const memPercentage = ((parseFloat(memLine[2]) / parseFloat(memLine[1])) * 100) || 0;

    // Get disk usage
    const { stdout: diskOutput } = await execAsync('df -h /');
    const diskLines = diskOutput.split('\n');
    const diskLine = diskLines[1].split(/\s+/);
    const diskUsed = diskLine[2];
    const diskTotal = diskLine[1];
    const diskPercentage = parseInt(diskLine[4].replace('%', ''), 10) || 0;

    return {
      cpu,
      memory: {
        used: memUsed,
        total: memTotal,
        percentage: memPercentage
      },
      disk: {
        used: diskUsed,
        total: diskTotal,
        percentage: diskPercentage
      }
    };
  } catch (error) {
    return {
      cpu: 0,
      memory: { used: '0', total: '0', percentage: 0 },
      disk: { used: '0', total: '0', percentage: 0 }
    };
  }
}
