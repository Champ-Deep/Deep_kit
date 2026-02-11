import React from 'react'

interface StatusBarProps {
  health: any
}

export const StatusBar: React.FC<StatusBarProps> = ({ health }) => {
  if (!health) {
    return (
      <div className="flex items-center gap-4 text-xs">
        <span className="animate-pulse" style={{ color: 'var(--bright-amber)' }}>
          ● CONNECTING...
        </span>
      </div>
    )
  }

  const services = [
    {
      name: 'POSTGRES',
      status: health.connections?.postgres,
    },
    {
      name: 'OLLAMA',
      status: health.connections?.ollama,
    },
    {
      name: 'N8N',
      status: health.connections?.n8n,
      optional: true,
    },
  ]

  return (
    <div className="flex items-center gap-4 text-xs">
      {services.map(svc => (
        <div key={svc.name} className="flex items-center gap-1.5">
          <span
            style={{
              color: svc.status
                ? 'var(--phosphor-green)'
                : svc.optional
                ? 'var(--bright-amber)'
                : 'var(--error-red)',
              textShadow: svc.status
                ? '0 0 6px var(--phosphor-green)'
                : 'none',
            }}
          >
            {svc.status ? '●' : '○'}
          </span>
          <span style={{ color: 'var(--ghost-mono)' }}>
            {svc.name}
          </span>
        </div>
      ))}

      <div
        className="ml-2 px-2 py-0.5 border"
        style={{
          borderColor:
            health.status === 'healthy'
              ? 'var(--phosphor-green)'
              : 'var(--bright-amber)',
          color:
            health.status === 'healthy'
              ? 'var(--phosphor-green)'
              : 'var(--bright-amber)',
        }}
      >
        {health.status?.toUpperCase() || 'UNKNOWN'}
      </div>
    </div>
  )
}
