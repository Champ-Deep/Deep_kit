import React from 'react'
import { Card, CardHeader, Tag, Separator, PieChart } from '@crayonai/react-ui'

interface SystemStatusData {
  cpu?: {
    cores?: number
    load?: number | string
    load_1m?: string
    load_5m?: string
    load_15m?: string
    model?: string
  }
  memory?: {
    used?: number | string
    total?: number | string
    free?: number | string
    percent?: number | string
  }
  disk?: {
    used?: number | string
    total?: number | string
    percent?: number | string
  }
  uptime?: string
  hostname?: string
  platform?: string
  [key: string]: any
}

interface Props {
  data: SystemStatusData
  tool?: string | null
  duration?: string | null
  success?: boolean
}

const parseNum = (val: any): number => {
  if (typeof val === 'number') return val
  if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]/g, '')) || 0
  return 0
}

const severityVariant = (pct: number): 'success' | 'warning' | 'danger' =>
  pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'success'

const severityColor = (pct: number): string =>
  pct >= 90 ? '#FF3B3B' : pct >= 70 ? '#FFB000' : '#39FF14'

export const SystemStatusTemplate: React.FC<Props> = ({ data, tool, duration }) => {
  const { cpu, memory, disk, uptime, hostname } = data || {}

  const cpuLoad = parseNum(cpu?.load ?? cpu?.load_1m ?? 0)
  const cpuCores = parseNum(cpu?.cores ?? 0)

  const memPercent = parseNum(memory?.percent ?? 0)
  const memUsed = memory?.used ?? '0'
  const memTotal = memory?.total ?? '0'
  const memUsedStr = typeof memUsed === 'string' ? memUsed : `${memUsed} GB`
  const memTotalStr = typeof memTotal === 'string' ? memTotal : `${memTotal} GB`

  const hasDisk = disk && (disk.percent != null || disk.used != null)
  const diskPercent = hasDisk ? parseNum(disk!.percent ?? 0) : 0

  const memChartData = [
    { segment: 'USED', value: memPercent },
    { segment: 'FREE', value: 100 - memPercent },
  ]

  const diskChartData = hasDisk ? [
    { segment: 'USED', value: diskPercent },
    { segment: 'FREE', value: 100 - diskPercent },
  ] : []

  return (
    <Card variant="card" width="full">
      <CardHeader
        icon={<span style={{ color: '#39FF14', fontSize: '18px' }}>&#9889;</span>}
        title="SYSTEM STATUS"
        subtitle={hostname || 'deepkit-host'}
      />

      {/* Big numbers row */}
      <div className="grid grid-cols-2 gap-4 px-4 pt-4 pb-2">
        {/* CPU Load */}
        <div className="text-center">
          <div
            className="text-4xl font-bold"
            style={{
              color: cpuLoad > 8 ? '#FF3B3B' : cpuLoad > 5 ? '#FFB000' : '#39FF14',
              textShadow: `0 0 16px ${cpuLoad > 8 ? '#FF3B3B' : cpuLoad > 5 ? '#FFB000' : '#39FF14'}`,
            }}
          >
            {cpuLoad.toFixed(1)}
          </div>
          <div className="text-xs mt-1" style={{ color: '#A0A0A0', letterSpacing: '0.1em' }}>
            CPU LOAD
          </div>
          {cpuCores > 0 && <Tag text={`${cpuCores} CORES`} variant="info" size="sm" />}
        </div>

        {/* Uptime */}
        <div className="text-center">
          <div
            className="text-4xl font-bold"
            style={{ color: '#39FF14', textShadow: '0 0 16px #39FF14' }}
          >
            {uptime || 'N/A'}
          </div>
          <div className="text-xs mt-1" style={{ color: '#A0A0A0', letterSpacing: '0.1em' }}>
            UPTIME
          </div>
          <Tag text="ONLINE" variant="success" size="sm" />
        </div>
      </div>

      <Separator />

      {/* Donut gauges row */}
      <div className={`grid ${hasDisk ? 'grid-cols-2' : 'grid-cols-1'} gap-4 px-4 py-4`}>
        {/* Memory donut */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: '#A0A0A0', letterSpacing: '0.1em' }}>
              MEMORY
            </span>
            <Tag text={`${memUsedStr} / ${memTotalStr}`} variant={severityVariant(memPercent)} size="sm" />
          </div>
          <div className="flex items-center justify-center">
            <div style={{ position: 'relative' }}>
              <PieChart
                data={memChartData}
                categoryKey="segment"
                dataKey="value"
                variant="donut"
                customPalette={[severityColor(memPercent), '#1a1a1a']}
                height={160}
                width={160}
                maxChartSize={160}
                legend={false}
              />
              {/* Center label */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color: severityColor(memPercent),
                    textShadow: `0 0 12px ${severityColor(memPercent)}`,
                  }}
                >
                  {memPercent}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Disk donut (if present) */}
        {hasDisk && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold" style={{ color: '#A0A0A0', letterSpacing: '0.1em' }}>
                DISK
              </span>
              <Tag text={`${disk!.used || '?'} / ${disk!.total || '?'}`} variant={severityVariant(diskPercent)} size="sm" />
            </div>
            <div className="flex items-center justify-center">
              <div style={{ position: 'relative' }}>
                <PieChart
                  data={diskChartData}
                  categoryKey="segment"
                  dataKey="value"
                  variant="donut"
                  customPalette={[severityColor(diskPercent), '#1a1a1a']}
                  height={160}
                  width={160}
                  maxChartSize={160}
                  legend={false}
                />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}>
                  <div
                    className="text-2xl font-bold"
                    style={{
                      color: severityColor(diskPercent),
                      textShadow: `0 0 12px ${severityColor(diskPercent)}`,
                    }}
                  >
                    {diskPercent}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer metadata */}
      {(tool || duration) && (
        <>
          <Separator />
          <div className="px-4 py-2 flex items-center justify-between text-xs" style={{ color: '#A0A0A0' }}>
            {tool && <span style={{ color: '#FFB000' }}>{tool}</span>}
            {duration && <span style={{ color: '#00F2FF' }}>[{duration}]</span>}
          </div>
        </>
      )}
    </Card>
  )
}
