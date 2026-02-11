import React from 'react'
import {
  Card, CardHeader, Tag, Steps, StepsItem, CodeBlock, Separator,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@crayonai/react-ui'

interface WorkflowData {
  action: 'created' | 'triggered' | 'list' | 'status'
  workflow?: {
    id: string
    name: string
    active: boolean
    nodes?: number
    lastRun?: string
  }
  workflows?: Array<{
    id: string
    name: string
    active: boolean
  }>
  execution?: {
    id: string
    status: 'running' | 'success' | 'error'
    startedAt: string
    finishedAt?: string
    data?: any
  }
  message?: string
}

interface Props {
  data: WorkflowData
  tool?: string | null
  duration?: string | null
  success?: boolean
}

export const WorkflowTemplate: React.FC<Props> = ({ data, tool, duration }) => {
  const { action, workflow, workflows, execution, message } = data

  // Workflow created
  if (action === 'created' && workflow) {
    return (
      <Card variant="card" width="full">
        <CardHeader
          icon={<span style={{ color: '#00F2FF', fontSize: '18px' }}>&#9881;</span>}
          title="Workflow Deployed"
          subtitle={workflow.name}
        />

        <div className="px-4 py-3">
          <Steps>
            <StepsItem
              number={1}
              title="Initialized"
              details={<span>Workflow <strong>{workflow.name}</strong> registered</span>}
            />
            <StepsItem
              number={2}
              title="Configured"
              details={
                <span className="flex items-center gap-2">
                  {workflow.nodes && <Tag text={`${workflow.nodes} nodes`} variant="info" size="sm" />}
                  <span style={{ color: '#A0A0A0', fontSize: '11px' }}>ID: {workflow.id}</span>
                </span>
              }
            />
            <StepsItem
              number={3}
              title="Deployed"
              details={
                <Tag
                  text={workflow.active ? 'Active' : 'Standby'}
                  variant={workflow.active ? 'success' : 'neutral'}
                  size="sm"
                />
              }
            />
          </Steps>
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

  // Workflow triggered / execution
  if (action === 'triggered' && execution) {
    const statusVariant =
      execution.status === 'success' ? 'success'
        : execution.status === 'error' ? 'danger'
          : 'warning'

    return (
      <Card variant="card" width="full">
        <CardHeader
          icon={<span style={{ color: '#00F2FF', fontSize: '18px' }}>&#9881;</span>}
          title="Execution Complete"
          subtitle={`Run ${execution.id.slice(0, 8)}`}
        />

        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <Tag text={execution.status.charAt(0).toUpperCase() + execution.status.slice(1)} variant={statusVariant} size="md" />
            <span className="text-xs" style={{ color: '#A0A0A0' }}>
              {new Date(execution.startedAt).toLocaleTimeString()}
            </span>
          </div>

          {execution.data && (
            <CodeBlock
              codeString={JSON.stringify(execution.data, null, 2)}
              language="json"
            />
          )}
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

  // Workflow list — use Table for structured display
  if (action === 'list' && workflows) {
    return (
      <Card variant="card" width="full">
        <CardHeader
          icon={<span style={{ color: '#00F2FF', fontSize: '18px' }}>&#9881;</span>}
          title="Workflows"
          subtitle={`${workflows.length} deployed`}
        />

        <div className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ color: '#A0A0A0', fontSize: '11px' }}>Name</TableHead>
                <TableHead style={{ color: '#A0A0A0', fontSize: '11px', textAlign: 'right' }}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">
                        {wf.name}
                      </span>
                      <div className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>
                        {wf.id.slice(0, 12)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell style={{ textAlign: 'right' }}>
                    <Tag
                      text={wf.active ? 'Active' : 'Idle'}
                      variant={wf.active ? 'success' : 'neutral'}
                      size="sm"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

  // Default
  return (
    <Card variant="card" width="full">
      <CardHeader
        icon={<span style={{ color: '#00F2FF', fontSize: '18px' }}>&#9881;</span>}
        title="Workflow"
      />
      <div className="px-4 pb-4" style={{ color: '#A0A0A0' }}>
        {message || 'Workflow operation completed'}
      </div>
    </Card>
  )
}
