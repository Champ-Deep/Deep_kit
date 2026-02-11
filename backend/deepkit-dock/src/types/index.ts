// Port entry from OS or Docker
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

// Port conflict detection
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

// Port suggestion request
export interface PortSuggestionRequest {
  type: 'frontend' | 'backend' | 'database' | 'service';
  projectId: string;
  clusterSize?: number; // For clustered ports (e.g., 3300, 3301, 3302)
  preferredRange?: [number, number];
}

// Port suggestion response
export interface PortSuggestionResponse {
  recommended: number;
  alternatives: number[];
  reasoning: string;
  cluster?: number[];
}

// Project mapping
export interface Project {
  id: string;
  name: string;
  ports: Record<string, number>; // e.g., { frontend: 3000, backend: 5000 }
  preferences: {
    preferredPortRange?: [number, number];
    avoidPorts?: number[];
  };
  createdAt: number;
  updatedAt: number;
}

// Port personality (gamification)
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

// Port ranges (from DeepKit Brand Bible)
export const PORT_RANGES = {
  THE_FACE: { start: 3000, end: 3999, type: 'frontend' as const },
  THE_ENGINE: { start: 5000, end: 5999, type: 'backend' as const },
  THE_VAULT: { start: 6000, end: 7999, type: 'database' as const },
  THE_BRAIN: { start: 11000, end: 11999, type: 'service' as const },
  SYSTEM: { start: 0, end: 1023, type: 'system' as const }
};
