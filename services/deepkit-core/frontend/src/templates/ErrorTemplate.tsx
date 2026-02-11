import React from 'react'
import { Card, Callout, Tag, Separator } from '@crayonai/react-ui'

interface ErrorData {
  message: string
  code?: string
  details?: string
}

interface Props {
  data: ErrorData
  tool?: string | null
  duration?: string | null
  success?: boolean
}

export const ErrorTemplate: React.FC<Props> = ({ data, tool, duration }) => {
  const { message, code, details } = data

  return (
    <Card variant="card" width="full">
      {code && (
        <div className="px-4 pt-4">
          <Tag text={code} variant="danger" size="sm" />
        </div>
      )}

      <div className="px-4 py-3">
        <Callout
          variant="warning"
          title="ERROR"
          icon={<span style={{ fontSize: '16px' }}>&#9888;</span>}
          description={
            <div>
              <div>{message}</div>
              {details && (
                <div
                  className="mt-2 text-xs p-2"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: '#A0A0A0' }}
                >
                  {details}
                </div>
              )}
            </div>
          }
        />
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
