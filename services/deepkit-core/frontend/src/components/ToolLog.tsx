import React from 'react'

interface ToolExecution {
  tool: string
  args: any
  duration: string
  success: boolean
  timestamp: Date
}

interface ToolLogProps {
  executions: ToolExecution[]
}

export const ToolLog: React.FC<ToolLogProps> = ({ executions }) => {
  return (
    <div>
      <h3
        className="text-sm font-semibold mb-3 pb-2 border-b border-gray-800"
        style={{ color: 'var(--cyber-teal)' }}
      >
        TOOL EXECUTION LOG
      </h3>

      {executions.length === 0 ? (
        <div className="text-xs" style={{ color: 'var(--ghost-mono)' }}>
          No tool executions yet.
          <br />
          Try "List my tasks" or "System status"
        </div>
      ) : (
        <div className="space-y-2">
          {executions.map((exec, i) => (
            <div
              key={i}
              className="p-2 border border-gray-800/50 text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      color: exec.success
                        ? 'var(--phosphor-green)'
                        : 'var(--error-red)',
                    }}
                  >
                    {exec.success ? '✓' : '✗'}
                  </span>
                  <span className="font-medium">{exec.tool}</span>
                </div>
                <span style={{ color: 'var(--cyber-teal)' }}>
                  {exec.duration}
                </span>
              </div>
              {exec.args && Object.keys(exec.args).length > 0 && (
                <div
                  className="mt-1 pl-4"
                  style={{ color: 'var(--ghost-mono)' }}
                >
                  {Object.entries(exec.args)
                    .filter(([_, v]) => v != null)
                    .map(([k, v]) => (
                      <div key={k}>
                        {k}: {typeof v === 'string' ? v : JSON.stringify(v)}
                      </div>
                    ))}
                </div>
              )}
              <div
                className="mt-1 text-right"
                style={{ color: 'var(--ghost-mono)', opacity: 0.5 }}
              >
                {exec.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
