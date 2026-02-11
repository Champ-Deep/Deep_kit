"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestPort = suggestPort;
exports.analyzePort = analyzePort;
const types_1 = require("../types");
/**
 * Get port range for a specific type
 */
function getPortRangeForType(type) {
    switch (type) {
        case 'frontend':
            return [types_1.PORT_RANGES.THE_FACE.start, types_1.PORT_RANGES.THE_FACE.end];
        case 'backend':
            return [types_1.PORT_RANGES.THE_ENGINE.start, types_1.PORT_RANGES.THE_ENGINE.end];
        case 'database':
            return [types_1.PORT_RANGES.THE_VAULT.start, types_1.PORT_RANGES.THE_VAULT.end];
        case 'service':
            return [types_1.PORT_RANGES.THE_BRAIN.start, types_1.PORT_RANGES.THE_BRAIN.end];
        default:
            return [3000, 9999];
    }
}
/**
 * Check if a port is available (not in use)
 */
function isPortAvailable(port, inUsePorts) {
    return !inUsePorts.has(port);
}
/**
 * Find first available port in range
 */
function findFirstAvailable(range, inUsePorts) {
    for (let port = range[0]; port <= range[1]; port++) {
        if (isPortAvailable(port, inUsePorts)) {
            return port;
        }
    }
    throw new Error(`No available ports in range ${range[0]}-${range[1]}`);
}
/**
 * Find N consecutive available ports (for clustered deployments)
 */
function findCluster(size, range, inUsePorts) {
    for (let start = range[0]; start <= range[1] - size + 1; start++) {
        const cluster = [];
        let allAvailable = true;
        for (let i = 0; i < size; i++) {
            if (!isPortAvailable(start + i, inUsePorts)) {
                allAvailable = false;
                break;
            }
            cluster.push(start + i);
        }
        if (allAvailable) {
            return cluster;
        }
    }
    throw new Error(`No cluster of ${size} available ports in range ${range[0]}-${range[1]}`);
}
/**
 * Find alternative ports near the recommended port
 */
function findAlternatives(recommended, range, inUsePorts, count = 3) {
    const alternatives = [];
    const searchDistance = 10;
    // Search nearby ports
    for (let offset = 1; offset <= searchDistance && alternatives.length < count; offset++) {
        // Try above
        const above = recommended + offset;
        if (above <= range[1] && isPortAvailable(above, inUsePorts)) {
            alternatives.push(above);
        }
        // Try below
        const below = recommended - offset;
        if (below >= range[0] && isPortAvailable(below, inUsePorts)) {
            alternatives.push(below);
        }
    }
    // If still not enough, find any available in range
    if (alternatives.length < count) {
        for (let port = range[0]; port <= range[1] && alternatives.length < count; port++) {
            if (port !== recommended && isPortAvailable(port, inUsePorts) && !alternatives.includes(port)) {
                alternatives.push(port);
            }
        }
    }
    return alternatives.slice(0, count);
}
/**
 * Smart port suggestion engine
 */
async function suggestPort(request, currentPorts) {
    // Get port range for type
    const range = request.preferredRange || getPortRangeForType(request.type);
    // Build set of in-use ports
    const inUsePorts = new Set(currentPorts.map(p => p.port));
    // Handle cluster request
    if (request.clusterSize && request.clusterSize > 1) {
        try {
            const cluster = findCluster(request.clusterSize, range, inUsePorts);
            return {
                recommended: cluster[0],
                alternatives: [],
                reasoning: `Found cluster of ${request.clusterSize} consecutive ports starting at ${cluster[0]}`,
                cluster
            };
        }
        catch (error) {
            return {
                recommended: -1,
                alternatives: [],
                reasoning: `No cluster of ${request.clusterSize} consecutive ports available in range ${range[0]}-${range[1]}`,
                cluster: []
            };
        }
    }
    // Find first available port
    try {
        const recommended = findFirstAvailable(range, inUsePorts);
        const alternatives = findAlternatives(recommended, range, inUsePorts);
        const typeNames = {
            frontend: 'THE FACE',
            backend: 'THE ENGINE',
            database: 'THE VAULT',
            service: 'THE BRAIN'
        };
        return {
            recommended,
            alternatives,
            reasoning: `Port ${recommended} is the first available in the ${typeNames[request.type]} range (${range[0]}-${range[1]})`,
            cluster: undefined
        };
    }
    catch (error) {
        return {
            recommended: -1,
            alternatives: [],
            reasoning: error instanceof Error ? error.message : 'No ports available'
        };
    }
}
/**
 * Analyze a specific port
 */
function analyzePort(port, currentPorts) {
    const existing = currentPorts.find(p => p.port === port);
    let zone = 'UNASSIGNED';
    if (port >= 3000 && port <= 3999)
        zone = 'THE FACE';
    else if (port >= 5000 && port <= 5999)
        zone = 'THE ENGINE';
    else if (port >= 6000 && port <= 7999)
        zone = 'THE VAULT';
    else if (port >= 11000 && port <= 11999)
        zone = 'THE BRAIN';
    else if (port <= 1023)
        zone = 'SYSTEM (Protected)';
    if (existing) {
        return {
            available: false,
            details: existing,
            zone,
            recommendation: `Port ${port} is currently in use by ${existing.process} (PID: ${existing.pid})`
        };
    }
    return {
        available: true,
        zone,
        recommendation: `Port ${port} is available and located in ${zone}`
    };
}
//# sourceMappingURL=suggestion-engine.js.map