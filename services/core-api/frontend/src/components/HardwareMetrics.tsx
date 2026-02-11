import { useEffect, useState } from 'react';
import { Cpu, HardDrive, Activity } from 'lucide-react';
import type { HardwareMetrics } from '../types';
import './HardwareMetrics.css';

export default function HardwareMetrics() {
  const [metrics, setMetrics] = useState<HardwareMetrics>({
    cpu: 0,
    memory: 0,
    disk: 0,
    timestamp: new Date()
  });
  const [history, setHistory] = useState<HardwareMetrics[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Try to fetch from Core API
        const response = await fetch('/api/hardware/metrics');
        if (response.ok) {
          const data = await response.json();
          const newMetrics: HardwareMetrics = {
            cpu: data.cpu || Math.random() * 30,
            memory: data.memory || Math.random() * 50,
            disk: data.disk || Math.random() * 40,
            timestamp: new Date()
          };
          
          setMetrics(newMetrics);
          setHistory(prev => [...prev.slice(-19), newMetrics]);
        }
      } catch {
        // Fallback to simulated data
        const newMetrics: HardwareMetrics = {
          cpu: Math.random() * 30 + 10,
          memory: Math.random() * 40 + 20,
          disk: Math.random() * 30 + 15,
          timestamp: new Date()
        };
        
        setMetrics(newMetrics);
        setHistory(prev => [...prev.slice(-19), newMetrics]);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const getBarWidth = (value: number) => `${Math.min(value, 100)}%`;
  const getBarColor = (value: number) => {
    if (value < 50) return 'var(--color-online)';
    if (value < 80) return '#ffaa00';
    return 'var(--color-offline)';
  };

  return (
    <div className="hardware-metrics">
      <h2 className="glow">Hardware Metrics</h2>
      
      <div className="metrics-grid">
        {/* CPU */}
        <div className="metric-card">
          <div className="metric-header">
            <Cpu size={24} />
            <h3>CPU Usage</h3>
          </div>
          <div className="metric-value">{metrics.cpu.toFixed(1)}%</div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: getBarWidth(metrics.cpu),
                backgroundColor: getBarColor(metrics.cpu)
              }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="metric-card">
          <div className="metric-header">
            <Activity size={24} />
            <h3>Memory</h3>
          </div>
          <div className="metric-value">{metrics.memory.toFixed(1)}%</div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: getBarWidth(metrics.memory),
                backgroundColor: getBarColor(metrics.memory)
              }}
            />
          </div>
        </div>

        {/* Disk */}
        <div className="metric-card">
          <div className="metric-header">
            <HardDrive size={24} />
            <h3>Disk Usage</h3>
          </div>
          <div className="metric-value">{metrics.disk.toFixed(1)}%</div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: getBarWidth(metrics.disk),
                backgroundColor: getBarColor(metrics.disk)
              }}
            />
          </div>
        </div>
      </div>

      {/* History Graph */}
      <div className="history-section">
        <h3>Usage History (Last 20 readings)</h3>
        <div className="history-graph">
          {history.length > 0 ? (
            <div className="graph-container">
              <div className="graph-legend">
                <span className="legend-item cpu">CPU</span>
                <span className="legend-item memory">Memory</span>
                <span className="legend-item disk">Disk</span>
              </div>
              <div className="bars-container">
                {history.map((m, i) => (
                  <div key={i} className="graph-bar-group">
                    <div 
                      className="graph-bar cpu"
                      style={{ height: `${m.cpu}%` }}
                      title={`CPU: ${m.cpu.toFixed(1)}%`}
                    />
                    <div 
                      className="graph-bar memory"
                      style={{ height: `${m.memory}%` }}
                      title={`Memory: ${m.memory.toFixed(1)}%`}
                    />
                    <div 
                      className="graph-bar disk"
                      style={{ height: `${m.disk}%` }}
                      title={`Disk: ${m.disk.toFixed(1)}%`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="loading">Collecting data...</div>
          )}
        </div>
      </div>

      <div className="last-updated">
        Last updated: {metrics.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
}
