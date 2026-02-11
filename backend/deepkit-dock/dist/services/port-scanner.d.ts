import { PortEntry, PortConflict } from '../types';
/**
 * Scan ports using lsof (macOS/Linux)
 */
export declare function scanOSPorts(): Promise<PortEntry[]>;
/**
 * Scan Docker containers for port mappings
 */
export declare function scanDockerPorts(): Promise<PortEntry[]>;
/**
 * Scan all ports (OS + Docker)
 */
export declare function scanAllPorts(): Promise<PortEntry[]>;
/**
 * Detect port conflicts
 * A conflict occurs when:
 * 1. Multiple processes trying to bind to the same port
 * 2. Reserved port is in use by different process
 */
export declare function detectConflicts(ports: PortEntry[]): PortConflict[];
/**
 * Categorize port by range
 */
export declare function categorizePort(port: number): PortEntry['portType'];
//# sourceMappingURL=port-scanner.d.ts.map