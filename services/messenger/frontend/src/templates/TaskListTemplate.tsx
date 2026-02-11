import React from 'react'
import {
  Card, CardHeader, Tag, Callout, Separator,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@crayonai/react-ui'

interface Task {
  id: string
  title: string
  status: 'pending' | 'completed' | 'in_progress'
  priority: 'low' | 'medium' | 'high'
  created_at?: string
}

interface TaskListData {
  tasks: Task[]
  count: number
  message?: string
}

interface Props {
  data: TaskListData
  tool?: string | null
  duration?: string | null
  success?: boolean
}

const statusConfig: Record<string, { variant: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; label: string; color: string }> = {
  completed: { variant: 'success', label: 'DONE', color: '#39FF14' },
  in_progress: { variant: 'warning', label: 'ACTIVE', color: '#FFB000' },
  pending: { variant: 'neutral', label: 'PENDING', color: '#A0A0A0' },
}

const priorityConfig: Record<string, { variant: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; label: string }> = {
  high: { variant: 'danger', label: 'HIGH' },
  medium: { variant: 'warning', label: 'MED' },
  low: { variant: 'neutral', label: 'LOW' },
}

export const TaskListTemplate: React.FC<Props> = ({ data, tool, duration }) => {
  const { tasks, count, message } = data

  if (count === 0 || !tasks?.length) {
    return (
      <Card variant="card" width="full">
        <CardHeader
          icon={<span style={{ fontSize: '18px' }}>&#128203;</span>}
          title="TASK ARSENAL"
        />
        <div className="px-4 pb-4">
          <Callout
            variant="neutral"
            title="NO TASKS DEPLOYED"
            description={message || 'Create one with "Create a task called..."'}
          />
        </div>
      </Card>
    )
  }

  return (
    <Card variant="card" width="full">
      <CardHeader
        icon={<span style={{ fontSize: '18px' }}>&#128203;</span>}
        title="TASK ARSENAL"
        subtitle={`${count} deployed`}
      />

      <div className="px-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ color: '#A0A0A0', fontSize: '11px', letterSpacing: '0.1em', width: '16px' }}></TableHead>
              <TableHead style={{ color: '#A0A0A0', fontSize: '11px', letterSpacing: '0.1em' }}>TASK</TableHead>
              <TableHead style={{ color: '#A0A0A0', fontSize: '11px', letterSpacing: '0.1em', textAlign: 'center' }}>STATUS</TableHead>
              <TableHead style={{ color: '#A0A0A0', fontSize: '11px', letterSpacing: '0.1em', textAlign: 'right' }}>PRIORITY</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const status = statusConfig[task.status] || statusConfig.pending
              const priority = priorityConfig[task.priority] || priorityConfig.low

              return (
                <TableRow key={task.id}>
                  <TableCell style={{ width: '16px', padding: '8px 4px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: status.color,
                        boxShadow: task.status !== 'pending' ? `0 0 6px ${status.color}` : 'none',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium" style={{ letterSpacing: '0.02em' }}>
                        {task.title}
                      </span>
                      <div className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>
                        {task.id.slice(0, 8)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell style={{ textAlign: 'center' }}>
                    <Tag text={status.label} variant={status.variant} size="sm" />
                  </TableCell>
                  <TableCell style={{ textAlign: 'right' }}>
                    <Tag text={priority.label} variant={priority.variant} size="sm" />
                  </TableCell>
                </TableRow>
              )
            })}
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
