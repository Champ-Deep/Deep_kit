/**
 * DeepKit Hub API Client
 * Wrapper for all backend API endpoints with error handling and timeouts
 */

interface ServiceHealth {
  name: string;
  port: number;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'UNKNOWN';
  healthy: boolean;
  responseTime?: number;
  error?: string;
  type: 'http' | 'tcp';
  zone: string;
}

interface HealthResponse {
  timestamp: string;
  services: ServiceHealth[];
  summary: {
    total: number;
    online: number;
    offline: number;
  };
}

interface HardwareMetrics {
  cpu: number;
  memory: number;
  gpu: number;
  timestamp: string;
}

interface EventBusMessage {
  event: string;
  service: string;
  timestamp: string;
  data?: any;
}

interface ThemeSettings {
  [key: string]: any;
}

interface BackupStatus {
  enabled: boolean;
  lastBackup: {
    timestamp: string;
    filename: string;
    size: number;
    sizeMB: string;
    hoursAgo: string;
  } | null;
  backupCount: number;
  totalSize: number;
  totalSizeMB: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'NO_BACKUPS' | 'ERROR';
  message: string;
  retentionDays?: number;
  interval?: string;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = '/api', timeout: number = 3000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async getServicesHealth(): Promise<HealthResponse> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/services/health`);
    if (!response.ok) {
      throw new Error(`Failed to fetch services health: ${response.statusText}`);
    }
    return response.json();
  }

  async getServiceHealth(name: string): Promise<ServiceHealth> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/services/${name}/health`);
    if (!response.ok) {
      throw new Error(`Failed to fetch service health: ${response.statusText}`);
    }
    return response.json();
  }

  async getHardwareMetrics(): Promise<HardwareMetrics> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/hardware/metrics`);
    if (!response.ok) {
      throw new Error(`Failed to fetch hardware metrics: ${response.statusText}`);
    }
    return response.json();
  }

  async getRecentEvents(): Promise<EventBusMessage[]> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/events/recent`);
    if (!response.ok) {
      throw new Error(`Failed to fetch recent events: ${response.statusText}`);
    }
    return response.json();
  }

  async getThemeSettings(userId: string = 'default'): Promise<ThemeSettings> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/theme/settings?user_id=${userId}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch theme settings: ${response.statusText}`);
    }
    return response.json();
  }

  async saveThemeSettings(settings: ThemeSettings, userId: string = 'default'): Promise<ThemeSettings> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/theme/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...settings, user_id: userId }),
    });
    if (!response.ok) {
      throw new Error(`Failed to save theme settings: ${response.statusText}`);
    }
    return response.json();
  }

  async getServiceStats(name: string): Promise<any> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/services/${name}/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch service stats: ${response.statusText}`);
    }
    return response.json();
  }

  async scanPorts(): Promise<any> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/ports/scan`);
    if (!response.ok) {
      throw new Error(`Failed to scan ports: ${response.statusText}`);
    }
    return response.json();
  }

  async suggestPorts(): Promise<any> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/ports/suggest`);
    if (!response.ok) {
      throw new Error(`Failed to suggest ports: ${response.statusText}`);
    }
    return response.json();
  }

  async getBackupStatus(): Promise<BackupStatus> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/backups/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch backup status: ${response.statusText}`);
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();
export type { ServiceHealth, HealthResponse, HardwareMetrics, EventBusMessage, ThemeSettings, BackupStatus };
