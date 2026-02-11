import { exec } from 'child_process';
import { promisify } from 'util';
import Docker from 'dockerode';
import { PortEntry, PortConflict } from '../types';

const execAsync = promisify(exec);

/**
 * Parse lsof output into PortEntry objects
 * Example line: "node    12345 user   18u  IPv4 0x1234  0t0  TCP *:3000 (LISTEN)"
 */
function parseOSOutput(output: string): PortEntry[] {
  const entries: PortEntry[] = [];
  const lines = output.split('\n').filter(line => line.trim());

  for (const line of lines.slice(1)) { // Skip header
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) continue;

    const process = parts[0];
    const pid = parseInt(parts[1], 10);
    const portInfo = parts[8];

    // Extract port number from format like "*:3000" or "localhost:5678"
    const match = portInfo.match(/:(\d+)/);
    if (!match) continue;

    const port = parseInt(match[1], 10);
    const state = parts[9]?.replace(/[()]/g, '') || 'LISTEN';

    entries.push({
      port,
      process,
      pid,
      protocol: 'tcp',
      state: state as 'LISTEN' | 'ESTABLISHED' | 'TIME_WAIT',
      source: 'os',
      timestamp: Date.now()
    });
  }

  return entries;
}

/**
 * Scan ports using lsof (macOS/Linux)
 */
export async function scanOSPorts(): Promise<PortEntry[]> {
  try {
    const { stdout } = await execAsync('lsof -iTCP -sTCP:LISTEN -n -P');
    return parseOSOutput(stdout);
  } catch (error) {
    // lsof returns exit code 1 if no ports found - this is not an error
    if (error instanceof Error && 'code' in error && error.code === 1) {
      return [];
    }
    console.error('OS port scan error:', error);
    return [];
  }
}

/**
 * Scan Docker containers for port mappings
 */
export async function scanDockerPorts(): Promise<PortEntry[]> {
  const entries: PortEntry[] = [];

  try {
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    const containers = await docker.listContainers();

    for (const container of containers) {
      if (!container.Ports) continue;

      for (const portMapping of container.Ports) {
        if (!portMapping.PublicPort) continue;

        entries.push({
          port: portMapping.PublicPort,
          process: container.Names[0]?.replace(/^\//, '') || 'unknown',
          pid: -1, // Docker containers don't have host PIDs
          protocol: (portMapping.Type as 'tcp' | 'udp') || 'tcp',
          state: 'LISTEN',
          source: 'docker',
          dockerContainer: {
            id: container.Id,
            name: container.Names[0]?.replace(/^\//, '') || 'unknown',
            image: container.Image
          },
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    console.error('Docker port scan error:', error);
  }

  return entries;
}

/**
 * Merge and deduplicate port entries from multiple sources
 */
function mergePorts(portLists: PortEntry[][]): PortEntry[] {
  const portMap = new Map<number, PortEntry>();

  for (const list of portLists) {
    for (const entry of list) {
      const existing = portMap.get(entry.port);
      if (!existing) {
        portMap.set(entry.port, entry);
      } else {
        // Docker source takes precedence over OS
        if (entry.source === 'docker' && existing.source === 'os') {
          portMap.set(entry.port, entry);
        }
      }
    }
  }

  return Array.from(portMap.values()).sort((a, b) => a.port - b.port);
}

/**
 * Scan all ports (OS + Docker)
 */
export async function scanAllPorts(): Promise<PortEntry[]> {
  const [osPorts, dockerPorts] = await Promise.all([
    scanOSPorts(),
    scanDockerPorts()
  ]);

  return mergePorts([osPorts, dockerPorts]);
}

/**
 * Detect port conflicts
 * A conflict occurs when:
 * 1. Multiple processes trying to bind to the same port
 * 2. Reserved port is in use by different process
 */
export function detectConflicts(ports: PortEntry[]): PortConflict[] {
  const conflicts: PortConflict[] = [];
  const portGroups = new Map<number, PortEntry[]>();

  // Group ports by port number
  for (const entry of ports) {
    const group = portGroups.get(entry.port) || [];
    group.push(entry);
    portGroups.set(entry.port, group);
  }

  // Check for conflicts
  for (const [port, entries] of portGroups.entries()) {
    if (entries.length > 1) {
      // Multiple processes on same port - CRITICAL
      conflicts.push({
        port,
        processes: entries.map(e => ({
          pid: e.pid,
          name: e.process,
          source: e.source
        })),
        severity: 'critical',
        detectedAt: Date.now()
      });
    }
  }

  return conflicts;
}

/**
 * Categorize port by range
 */
export function categorizePort(port: number): PortEntry['portType'] {
  if (port >= 3000 && port <= 3999) return 'frontend';
  if (port >= 5000 && port <= 5999) return 'backend';
  if (port >= 6000 && port <= 7999) return 'database';
  if (port >= 11000 && port <= 11999) return 'service';
  if (port <= 1023) return 'system';
  return undefined;
}
