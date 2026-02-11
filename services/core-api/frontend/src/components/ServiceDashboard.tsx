import { useEffect, useState } from 'react';
import { 
  Activity, 
  Bot, 
  Database, 
  Server, 
  Workflow,
  Shield
} from 'lucide-react';
import type { Service } from '../types';
import './ServiceDashboard.css';

const services: Service[] = [
  { name: 'Core API', port: 7777, status: 'unknown', description: 'AI orchestration and tool execution', category: 'core' },
  { name: 'Gateway', port: 3333, status: 'unknown', description: 'Message gateway for all channels', category: 'core' },
  { name: 'Task Tracker', port: 7718, status: 'unknown', description: 'Gamified task management', category: 'core' },
  { name: 'n8n', port: 5678, status: 'unknown', description: 'Workflow automation', category: 'automation' },
  { name: 'OpenCode', port: 4096, status: 'unknown', description: 'AI agent runtime', category: 'ai' },
  { name: 'PostgreSQL', port: 5432, status: 'unknown', description: 'Primary database', category: 'data' },
  { name: 'Redis', port: 6379, status: 'unknown', description: 'Cache and sessions', category: 'data' },
  { name: 'Ollama', port: 11434, status: 'unknown', description: 'Local AI inference', category: 'ai' },
  { name: 'Portainer', port: 9000, status: 'unknown', description: 'Docker management', category: 'core' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  core: <Server size={20} />,
  ai: <Bot size={20} />,
  data: <Database size={20} />,
  automation: <Workflow size={20} />,
};

export default function ServiceDashboard() {
  const [serviceStatus, setServiceStatus] = useState<Service[]>(services);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkServices();
    const interval = setInterval(checkServices, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const checkServices = async () => {
    setLoading(true);

    const updated = await Promise.all(
      services.map(async (service) => {
        try {
          const response = await fetch(`/api/health?service=${service.name.toLowerCase().replace(' ', '-')}`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          const newStatus: 'online' | 'offline' = response.ok ? 'online' : 'offline';
          return { ...service, status: newStatus };
        } catch {
          return { ...service, status: 'offline' as const };
        }
      })
    );

    setServiceStatus(updated);
    setLoading(false);
  };

  const onlineCount = serviceStatus.filter(s => s.status === 'online').length;
  const offlineCount = serviceStatus.filter(s => s.status === 'offline').length;

  return (
    <div className="service-dashboard">
      <div className="dashboard-header">
        <h2 className="glow">System Status</h2>
        <div className="status-summary">
          <span className="status-badge online">
            <span className="status-dot status-online"></span>
            {onlineCount} Online
          </span>
          <span className="status-badge offline">
            <span className="status-dot status-offline"></span>
            {offlineCount} Offline
          </span>
          <button onClick={checkServices} disabled={loading}>
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="services-grid">
        {serviceStatus.map((service) => (
          <div 
            key={service.name} 
            className={`service-card ${service.status}`}
          >
            <div className="service-header">
              <div className="service-icon">
                {categoryIcons[service.category] || <Activity size={20} />}
              </div>
              <div className={`service-status-indicator ${service.status}`}>
                {service.status === 'online' ? '●' : '○'}
              </div>
            </div>
            
            <h3>{service.name}</h3>
            <p className="service-description">{service.description}</p>
            <p className="service-port">Port {service.port}</p>
            
            <div className="service-category">{service.category}</div>
          </div>
        ))}
      </div>

      <div className="quick-actions">
        <h3>Quick Access</h3>
        <div className="action-buttons">
          <a href="http://localhost:7718" target="_blank" rel="noopener noreferrer">
            <button><Activity size={16} /> Task Tracker</button>
          </a>
          <a href="http://localhost:5678" target="_blank" rel="noopener noreferrer">
            <button><Workflow size={16} /> n8n Workflows</button>
          </a>
          <a href="http://localhost:9000" target="_blank" rel="noopener noreferrer">
            <button><Shield size={16} /> Portainer</button>
          </a>
        </div>
      </div>
    </div>
  );
}
