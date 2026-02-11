import { useState, useEffect, useRef } from 'react';
import {
  Activity, Cpu, Database, Terminal, Shield,
  CheckCircle2, Settings,
  AlertTriangle, Workflow, BrainCircuit, FileText, Search, Box,
  QrCode, Link, BarChart3,
  RefreshCw
} from 'lucide-react';
import { apiClient, ServiceHealth, HardwareMetrics, BackupStatus } from './api/client';

/**
 * DEEPKIT CORE V5.6 - THE SILENT ADMIN EDITION
 * Featuring live API integration with the Hub backend
 */

const COLORS = {
  deepCore: '#0A0B10',
  portActive: '#7000FF',
  dataFlow: '#00F2FF',
  warning: '#FF3B3B',
  text: '#FFFFFF',
  textDim: '#A0A0A0'
};

// Icon mapping for discovered services
const SERVICE_ICONS: Record<string, any> = {
  'automation': Workflow,
  'n8n': Workflow,
  'ollama': BrainCircuit,
  'chat': BrainCircuit,
  'brain': BrainCircuit,
  'content': FileText,
  'strapi': FileText,
  'pdf': Box,
  'research': Search,
  'crm': Database,
  'vector': Database,
  'postgres': Database,
  'neo4j': Database,
  'redis': Database,
  'qr': QrCode,
  'link': Link,
  'marketing': BarChart3,
  'calendar': Activity,
  'task': CheckCircle2,
  'default': Terminal
};

function getIconForService(name: string) {
  const lowerName = name.toLowerCase();
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (lowerName.includes(key)) return icon;
  }
  return SERVICE_ICONS.default;
}

// --- MICRO-UI COMPONENTS ---

const StatusPill = ({ status = 'Running', color = COLORS.dataFlow }: { status?: string; color?: string }) => (
  <div className="flex items-center gap-2 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-tighter"
    style={{ borderColor: `${color}33`, color: color, backgroundColor: `${color}11` }}>
    <div className={`h-1 w-1 rounded-full ${status === 'Running' || status === 'ONLINE' ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: color }} />
    {status}
  </div>
);

const MiniToggle = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-8 h-3 rounded-full relative transition-all duration-300 border border-white/10 bg-white/5 overflow-hidden"
  >
    <div className="absolute top-0 bottom-0 transition-all duration-300"
      style={{ left: active ? '50%' : '0', width: '50%', backgroundColor: active ? COLORS.dataFlow : 'rgba(255,255,255,0.2)' }} />
  </button>
);

const DataBit = ({ label, value }: { label: string; value: string | number }) => (
  <div className="font-mono text-[9px] leading-tight">
    <span className="opacity-40 uppercase">{label}:</span>{' '}
    <span style={{ color: COLORS.dataFlow }}>{value}</span>
  </div>
);

const ProgressSliver = ({ progress = 45, color = COLORS.dataFlow }: { progress?: number; color?: string }) => (
  <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5">
    <div className="h-full transition-all duration-500"
      style={{ width: `${progress}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
  </div>
);

// --- THE SILENT ADMIN MASCOT ---

const TheNexus = ({ size = 120, state = 'idle', className = "" }: { size?: number; state?: string; className?: string }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / 30;
      const y = (e.clientY - rect.top - rect.height / 2) / 30;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative group perspective-1000 ${className}`}
      style={{
        width: size,
        height: size * 0.56,
        transform: `rotateY(${mousePos.x}deg) rotateX(${-mousePos.y}deg)`,
        transition: 'transform 0.1s ease-out'
      }}
    >
      <div className={`absolute inset-0 rounded-sm border transition-all duration-500 ${state === 'processing' ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,242,255,0.4)]' : 'border-white/20'}`} />

      <div className="relative w-full h-full overflow-hidden rounded-sm bg-black flex items-center justify-center">
        <Terminal size={size * 0.4} style={{ color: COLORS.dataFlow, opacity: 0.6 }} />
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

        {state === 'processing' && (
          <div className="absolute inset-0 bg-cyan-500/10 animate-pulse flex items-center justify-center">
            <div className="text-[10px] font-mono font-bold text-cyan-400 tracking-widest bg-black/80 px-2 py-1 uppercase animate-bounce">
              SYNCING...
            </div>
          </div>
        )}
      </div>

      <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-cyan-400/50" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-cyan-400/50" />
    </div>
  );
};

// --- PRIMARY COMPONENTS ---

const DeepCard = ({ children, title, className = "", progress, service, onClick, ...props }: any) => (
  <div
    className={`relative bg-white/[0.03] border border-white/10 backdrop-blur-[15px] p-5 overflow-hidden group transition-all duration-300 hover:border-white/20 ${className}`}
    onClick={onClick}
    {...props}
  >
    {progress !== undefined && <ProgressSliver progress={progress} />}
    {title && (
      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 italic">{title}</h3>
        {service && <div className="text-[10px] font-mono font-bold" style={{ color: COLORS.dataFlow }}>PORT:{service.port}</div>}
      </div>
    )}
    {children}
  </div>
);

// --- MAIN HUB APP ---

export default function App() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [hardware, setHardware] = useState<HardwareMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState({ snapping: true, pulse: true, safe: true });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);

  // Fetch services and hardware metrics
  const fetchData = async () => {
    try {
      const [healthData, hardwareData, backupData] = await Promise.all([
        apiClient.getServicesHealth(),
        apiClient.getHardwareMetrics(),
        apiClient.getBackupStatus()
      ]);
      setServices(healthData.services);
      setHardware(hardwareData);
      setBackupStatus(backupData);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const triggerProcess = () => {
    setIsProcessing(true);
    fetchData(); // Refresh data
    setTimeout(() => setIsProcessing(false), 3000);
  };

  const onlineServices = services.filter(s => s.healthy).length;
  const totalServices = services.length;

  return (
    <div className="min-h-screen bg-[#0A0B10] text-white font-sans selection:bg-[#7000FF]/30 overflow-x-hidden p-6 md:p-12 flex flex-col items-center">
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] scanlines z-50" />

      <header className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center mb-16 border-b border-white/5 pb-8 gap-8">
        <div className="flex items-center gap-5">
          <TheNexus size={80} state={isProcessing ? 'processing' : 'idle'} />
          <div className="text-left ml-2">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              DEEPKIT <span style={{ color: COLORS.dataFlow }}>// HUB</span>
            </h1>
            <p className="text-[10px] font-mono opacity-40 tracking-[0.4em] uppercase mt-1">
              Sovereign Admin Interface // V5.6 // LIVE
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="text-right mr-4">
            <DataBit label="SERVICES" value={`${onlineServices}/${totalServices}`} />
            <DataBit label="UPDATED" value={lastUpdate.toLocaleTimeString()} />
          </div>
          <button
            onClick={fetchData}
            className="p-2 border border-white/20 hover:bg-white/5 transition-all"
            title="Refresh now"
          >
            <RefreshCw size={16} style={{ color: COLORS.dataFlow }} />
          </button>
        </div>
      </header>

      {error && (
        <div className="w-full max-w-7xl mb-8 p-4 bg-red-500/10 border border-red-500/20 text-left">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} style={{ color: COLORS.warning }} />
            <span className="text-[10px] font-black uppercase" style={{ color: COLORS.warning }}>
              CONNECTION ERROR: {error}
            </span>
          </div>
        </div>
      )}

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <DeepCard title="System_Status" progress={isProcessing ? 100 : 0}>
            <div className="flex flex-col md:flex-row items-center gap-12 py-6">
              <TheNexus size={280} state={isProcessing ? 'processing' : 'idle'} />
              <div className="flex-1 space-y-6 text-left">
                <h2 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] italic">
                  DeepKit Arsenal <br /><span style={{ color: COLORS.dataFlow }}>Online.</span>
                </h2>
                <div className="flex flex-wrap gap-3">
                  <StatusPill
                    status={loading ? "Loading" : `${onlineServices} ONLINE`}
                    color={onlineServices > 0 ? COLORS.dataFlow : COLORS.warning}
                  />
                  <StatusPill status="Local Mode" color={COLORS.portActive} />
                </div>
                <p className="text-sm opacity-50 leading-relaxed font-medium">
                  {loading
                    ? 'Scanning local services...'
                    : `${onlineServices} of ${totalServices} services are running. All compute cycles secured.`
                  }
                </p>
                <div className="pt-2 flex flex-wrap gap-4">
                  <button
                    onClick={triggerProcess}
                    disabled={isProcessing}
                    className="px-8 py-3 bg-[#7000FF] font-black text-[10px] tracking-[0.2em] uppercase transition-all active:scale-95 hover:brightness-125 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ boxShadow: `0 0 20px rgba(112, 0, 255, 0.4)` }}
                  >
                    {isProcessing ? 'Syncing...' : 'Refresh_All'}
                  </button>
                </div>
              </div>
            </div>
          </DeepCard>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              <DeepCard title="Loading">
                <div className="py-8 text-center opacity-40">
                  <Terminal className="mx-auto mb-2" size={24} />
                  <p className="text-[10px]">Discovering services...</p>
                </div>
              </DeepCard>
            ) : (
              services.map(service => {
                const Icon = getIconForService(service.name);
                const statusColor = service.healthy ? COLORS.dataFlow : COLORS.warning;
                return (
                  <DeepCard
                    key={service.name}
                    title={service.name}
                    service={service}
                    className="cursor-pointer hover:bg-white/5 transition-colors text-left"
                    onClick={() => window.open(`http://localhost:${service.port}`, '_blank')}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <Icon size={20} style={{ color: statusColor }} />
                        <StatusPill status={service.status} color={statusColor} />
                      </div>
                      <div className="space-y-1">
                        <DataBit label="ZONE" value={service.zone || 'UNKNOWN'} />
                        <DataBit label="PORT" value={service.port} />
                        <DataBit label="TYPE" value={service.type.toUpperCase()} />
                      </div>
                    </div>
                  </DeepCard>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <DeepCard title="Hardware_Pulse">
            <div className="space-y-4">
              {hardware ? (
                <>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] opacity-40 uppercase">CPU</span>
                      <span className="text-[9px] font-bold" style={{ color: COLORS.dataFlow }}>{hardware.cpu}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-500" style={{
                        width: `${hardware.cpu}%`,
                        backgroundColor: COLORS.dataFlow,
                        boxShadow: `0 0 10px ${COLORS.dataFlow}`
                      }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] opacity-40 uppercase">MEMORY</span>
                      <span className="text-[9px] font-bold" style={{ color: COLORS.dataFlow }}>{hardware.memory}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-500" style={{
                        width: `${hardware.memory}%`,
                        backgroundColor: COLORS.dataFlow,
                        boxShadow: `0 0 10px ${COLORS.dataFlow}`
                      }} />
                    </div>
                  </div>
                  {hardware.gpu > 0 && (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] opacity-40 uppercase">GPU</span>
                        <span className="text-[9px] font-bold" style={{ color: COLORS.dataFlow }}>{hardware.gpu}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-500" style={{
                          width: `${hardware.gpu}%`,
                          backgroundColor: COLORS.dataFlow,
                          boxShadow: `0 0 10px ${COLORS.dataFlow}`
                        }} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-center opacity-40">
                  <Cpu className="mx-auto mb-2" size={24} />
                  <p className="text-[10px]">Loading metrics...</p>
                </div>
              )}
            </div>
          </DeepCard>

          <DeepCard title="Backup_Status">
            <div className="space-y-4">
              {backupStatus ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database size={16} style={{
                        color: backupStatus.status === 'HEALTHY' ? COLORS.dataFlow :
                               backupStatus.status === 'WARNING' ? '#FFB000' :
                               COLORS.warning
                      }} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">
                        {backupStatus.status}
                      </span>
                    </div>
                    <StatusPill
                      status={backupStatus.enabled ? 'ENABLED' : 'DISABLED'}
                      color={backupStatus.enabled ? COLORS.dataFlow : COLORS.textDim}
                    />
                  </div>

                  {backupStatus.lastBackup ? (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <DataBit
                        label="LAST BACKUP"
                        value={`${backupStatus.lastBackup.hoursAgo}h ago`}
                      />
                      <DataBit
                        label="SIZE"
                        value={`${backupStatus.lastBackup.sizeMB} MB`}
                      />
                      <DataBit
                        label="TOTAL BACKUPS"
                        value={backupStatus.backupCount}
                      />
                      <DataBit
                        label="RETENTION"
                        value={`${backupStatus.retentionDays} days`}
                      />
                    </div>
                  ) : (
                    <div className="py-4 text-center opacity-40">
                      <p className="text-[10px]">{backupStatus.message}</p>
                    </div>
                  )}

                  {backupStatus.status !== 'HEALTHY' && backupStatus.message && (
                    <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                      <p className="text-[9px] text-yellow-500">{backupStatus.message}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-center opacity-40">
                  <Database className="mx-auto mb-2" size={24} />
                  <p className="text-[10px]">Loading backup status...</p>
                </div>
              )}
            </div>
          </DeepCard>

          <div className="space-y-4 p-6 border-2 border-white/5 bg-white/[0.01] text-left">
            <div className="flex items-center gap-2 mb-2">
              <Settings size={14} className="opacity-40" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">System Config</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px]">
                <span className="opacity-40 uppercase">Auto-Refresh</span>
                <MiniToggle active={config.snapping} onClick={() => setConfig({ ...config, snapping: !config.snapping })} />
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="opacity-40 uppercase">Bioluminescence</span>
                <MiniToggle active={config.pulse} onClick={() => setConfig({ ...config, pulse: !config.pulse })} />
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="opacity-40 uppercase">Local Safe Mode</span>
                <MiniToggle active={config.safe} onClick={() => setConfig({ ...config, safe: !config.safe })} />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-[#00F2FF]/10 border border-[#00F2FF]/20 text-left">
            <Shield size={18} style={{ color: COLORS.dataFlow }} />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase" style={{ color: COLORS.dataFlow }}>Sovereign Mode</p>
              <p className="text-[9px] opacity-60 leading-tight">
                100% local compute. No cloud dependencies. Your data never leaves this machine.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 border-t border-white/5 w-full pt-8 flex justify-center opacity-30">
        <div className="text-[10px] font-black tracking-[1.5em] uppercase">DeepKit // Hub_v5.6 // 2026</div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap');

        body { font-family: 'Inter', sans-serif; background-color: #0A0B10; margin: 0; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .scanlines { background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%); background-size: 100% 4px; }

        .perspective-1000 { perspective: 1000px; }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        .animate-glitch {
          animation: glitch 0.2s infinite;
        }
      `}</style>
    </div>
  );
}
