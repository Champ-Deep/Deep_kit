"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanOSPorts = scanOSPorts;
exports.scanDockerPorts = scanDockerPorts;
exports.scanAllPorts = scanAllPorts;
exports.detectConflicts = detectConflicts;
exports.categorizePort = categorizePort;
const child_process_1 = require("child_process");
const util_1 = require("util");
const dockerode_1 = __importDefault(require("dockerode"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Parse lsof output into PortEntry objects
 * Example line: "node    12345 user   18u  IPv4 0x1234  0t0  TCP *:3000 (LISTEN)"
 */
function parseOSOutput(output) {
    const entries = [];
    const lines = output.split('\n').filter(line => line.trim());
    for (const line of lines.slice(1)) { // Skip header
        const parts = line.trim().split(/\s+/);
        if (parts.length < 9)
            continue;
        const process = parts[0];
        const pid = parseInt(parts[1], 10);
        const portInfo = parts[8];
        // Extract port number from format like "*:3000" or "localhost:5678"
        const match = portInfo.match(/:(\d+)/);
        if (!match)
            continue;
        const port = parseInt(match[1], 10);
        const state = parts[9]?.replace(/[()]/g, '') || 'LISTEN';
        entries.push({
            port,
            process,
            pid,
            protocol: 'tcp',
            state: state,
            source: 'os',
            timestamp: Date.now()
        });
    }
    return entries;
}
/**
 * Scan ports using lsof (macOS/Linux)
 */
async function scanOSPorts() {
    try {
        const { stdout } = await execAsync('lsof -iTCP -sTCP:LISTEN -n -P');
        return parseOSOutput(stdout);
    }
    catch (error) {
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
async function scanDockerPorts() {
    const entries = [];
    try {
        const docker = new dockerode_1.default({ socketPath: '/var/run/docker.sock' });
        const containers = await docker.listContainers();
        for (const container of containers) {
            if (!container.Ports)
                continue;
            for (const portMapping of container.Ports) {
                if (!portMapping.PublicPort)
                    continue;
                entries.push({
                    port: portMapping.PublicPort,
                    process: container.Names[0]?.replace(/^\//, '') || 'unknown',
                    pid: -1, // Docker containers don't have host PIDs
                    protocol: portMapping.Type || 'tcp',
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
    }
    catch (error) {
        console.error('Docker port scan error:', error);
    }
    return entries;
}
/**
 * Merge and deduplicate port entries from multiple sources
 */
function mergePorts(portLists) {
    const portMap = new Map();
    for (const list of portLists) {
        for (const entry of list) {
            const existing = portMap.get(entry.port);
            if (!existing) {
                portMap.set(entry.port, entry);
            }
            else {
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
async function scanAllPorts() {
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
function detectConflicts(ports) {
    const conflicts = [];
    const portGroups = new Map();
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
function categorizePort(port) {
    if (port >= 3000 && port <= 3999)
        return 'frontend';
    if (port >= 5000 && port <= 5999)
        return 'backend';
    if (port >= 6000 && port <= 7999)
        return 'database';
    if (port >= 11000 && port <= 11999)
        return 'service';
    if (port <= 1023)
        return 'system';
    return undefined;
}
//# sourceMappingURL=port-scanner.js.map