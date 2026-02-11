import React from 'react'
import { Card, CardHeader, Tag, Separator } from '@crayonai/react-ui'

interface Service {
  id: string
  name: string
  port: number
  zone: string
  healthy: boolean | null
  state?: string
  status?: string
  containerId?: string
  type?: string
}

interface ServiceGridData {
  services: Service[]
  count: number
  dockerAvailable?: boolean
}

interface Props {
  data: ServiceGridData
  tool?: string | null
  duration?: string | null
  success?: boolean
}

const zoneColors: Record<string, string> = {
  FACE: '#00F2FF',
  ENGINE: '#FFB000',
  VAULT: '#39FF14',
  BRAIN: '#A0A0A0',
  MONITOR: '#FF3B3B',
}

const zoneOrder = ['FACE', 'ENGINE', 'VAULT', 'BRAIN', 'MONITOR']

function groupByZone(services: Service[]): Record<string, Service[]> {
  const groups: Record<string, Service[]> = {}
  for (const service of services) {
    const zone = service.zone || 'FACE'
    if (!groups[zone]) groups[zone] = []
    groups[zone].push(service)
  }
  return groups
}

export const ServiceGridTemplate: React.FC<Props> = ({ data, tool, duration }) => {
  const { services = [], count, dockerAvailable } = data
  const grouped = groupByZone(services)

  return (
    <Card variant="card" width="full">
      <CardHeader
        icon={<span style={{ color: '#00F2FF', fontSize: '18px' }}>&#9881;</span>}
        title="Services"
        subtitle={`${count || services.length} running`}
      />

      {!dockerAvailable && (
        <div className="px-4 py-2 text-xs" style={{ color: '#FFB000' }}>
          Docker not available — showing static service list
        </div>
      )}

      <div className="px-4 py-3 space-y-4">
        {zoneOrder.map((zone) => {
          const zoneServices = grouped[zone]
          if (!zoneServices?.length) return null

          return (
            <div key={zone}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: zoneColors[zone] || '#A0A0A0',
                  }}
                />
                <span className="text-xs font-medium" style={{ color: '#A0A0A0' }}>
                  {zone}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {zoneServices.map((service) => (
                  <ServiceCard key={service.id} service={service} zoneColor={zoneColors[zone]} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

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

interface ServiceCardProps {
  service: Service
  zoneColor: string
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, zoneColor: _zoneColor }) => {
  void _zoneColor // Reserved for future zone-based theming
  const healthColor = service.healthy === true ? '#39FF14'
                    : service.healthy === false ? '#FF3B3B'
                    : '#A0A0A0'

  return (
    <div
      style={{
        padding: '10px 12px',
        backgroundColor: '#0d0d0d',
        border: '1px solid #1f1f1f',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div className="font-medium text-sm" style={{ color: '#FFFFFF' }}>
          {service.name}
        </div>
        <div className="text-xs" style={{ color: '#A0A0A0' }}>
          :{service.port}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: healthColor,
          }}
          title={service.healthy === true ? 'Healthy' : service.healthy === false ? 'Unhealthy' : 'Unknown'}
        />
        <Tag
          text={service.healthy === true ? 'Up' : service.healthy === false ? 'Down' : '?'}
          variant={service.healthy === true ? 'success' : service.healthy === false ? 'danger' : 'neutral'}
          size="sm"
        />
      </div>
    </div>
  )
}

export default ServiceGridTemplate
