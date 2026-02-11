export interface PortEntry {
    port: number;
    process: string;
    pid: number;
    protocol: 'tcp' | 'udp';
    state: 'LISTEN' | 'ESTABLISHED' | 'TIME_WAIT';
    projectId?: string;
    projectName?: string;
    portType?: 'frontend' | 'backend' | 'database' | 'service' | 'system';
    source: 'os' | 'docker' | 'reserved';
    dockerContainer?: {
        id: string;
        name: string;
        image: string;
    };
    timestamp: number;
}
export interface PortConflict {
    port: number;
    processes: Array<{
        pid: number;
        name: string;
        source: string;
    }>;
    severity: 'warning' | 'critical';
    detectedAt: number;
}
export interface PortSuggestionRequest {
    type: 'frontend' | 'backend' | 'database' | 'service';
    projectId: string;
    clusterSize?: number;
    preferredRange?: [number, number];
}
export interface PortSuggestionResponse {
    recommended: number;
    alternatives: number[];
    reasoning: string;
    cluster?: number[];
}
export interface Project {
    id: string;
    name: string;
    ports: Record<string, number>;
    preferences: {
        preferredPortRange?: [number, number];
        avoidPorts?: number[];
    };
    createdAt: number;
    updatedAt: number;
}
export interface PortPersonality {
    port: number;
    nickname: string;
    emoji: string;
    stats: {
        uptime: number;
        conflictsResolved: number;
        projectCount: number;
        streak: number;
    };
    achievements: string[];
    rank: number;
}
export declare const PORT_RANGES: {
    THE_FACE: {
        start: number;
        end: number;
        type: "frontend";
    };
    THE_ENGINE: {
        start: number;
        end: number;
        type: "backend";
    };
    THE_VAULT: {
        start: number;
        end: number;
        type: "database";
    };
    THE_BRAIN: {
        start: number;
        end: number;
        type: "service";
    };
    SYSTEM: {
        start: number;
        end: number;
        type: "system";
    };
};
//# sourceMappingURL=index.d.ts.map