export interface ServiceHealth {
  name: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
  uptime: string | null;
  lastCheck: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string[];
  created: string;
}

export interface DatabaseInfo {
  name: string;
  type: 'postgresql' | 'sqlite';
  size: string;
  tables: number;
  status: 'connected' | 'error';
}

export interface SystemStats {
  cpu: number;
  memory: {
    used: string;
    total: string;
    percentage: number;
  };
  disk: {
    used: string;
    total: string;
    percentage: number;
  };
}

export interface LogEntry {
  id: number;
  service: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}
