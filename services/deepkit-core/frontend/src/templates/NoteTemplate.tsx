import React from 'react'
import { Card, CardHeader, Tag, ListBlock, ListItem, Callout, Separator } from '@crayonai/react-ui'

interface NoteData {
  action: 'created' | 'found' | 'deleted' | 'list'
  note?: {
    id: string
    title: string
    content: string
    created_at?: string
  }
  notes?: Array<{
    id: string
    title: string
    content: string
    created_at?: string
  }>
  count?: number
  message?: string
}

interface Props {
  data: NoteData
  tool?: string | null
  duration?: string | null
  success?: boolean
}

export const NoteTemplate: React.FC<Props> = ({ data, tool, duration }) => {
  const { action, note, notes, count, message } = data

  // Single note created/found
  if ((action === 'created' || action === 'found') && note) {
    return (
      <Card variant="card" width="full">
        <CardHeader
          icon={<span style={{ color: '#FFB000', fontSize: '18px' }}>&#128221;</span>}
          title={action === 'created' ? 'Note Saved' : 'Note Found'}
          subtitle={note.title || 'Quick Note'}
        />

        <div className="px-4 py-3">
          <Tag text="Success" variant="success" size="sm" />

          <div
            className="mt-3 whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: '#FFFFFF' }}
          >
            {note.content}
          </div>

          <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: '#A0A0A0' }}>
            <span>ID: {note.id.slice(0, 8)}</span>
            {note.created_at && (
              <span>{new Date(note.created_at).toLocaleString()}</span>
            )}
          </div>
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

  // Note list
  if (action === 'list' && notes) {
    if (!notes.length) {
      return (
        <Card variant="card" width="full">
          <CardHeader
            icon={<span style={{ color: '#FFB000', fontSize: '18px' }}>&#128221;</span>}
            title="Notes"
          />
          <div className="px-4 pb-4">
            <Callout
              variant="neutral"
              title="No notes found"
              description='Save one with "Save a note: ..."'
            />
          </div>
        </Card>
      )
    }

    return (
      <Card variant="card" width="full">
        <CardHeader
          icon={<span style={{ color: '#FFB000', fontSize: '18px' }}>&#128221;</span>}
          title="Notes"
          subtitle={`${count || notes.length} found`}
        />

        <ListBlock>
          {notes.slice(0, 10).map((n) => (
            <ListItem
              key={n.id}
              title={
                <span className="font-medium">{n.title || 'Quick Note'}</span>
              }
              subtitle={
                <span className="text-xs" style={{ color: '#A0A0A0' }}>
                  {n.content.slice(0, 80)}{n.content.length > 80 ? '...' : ''}
                </span>
              }
              decorativeIcon={
                <span style={{ color: '#FFB000', fontSize: '14px' }}>&#9679;</span>
              }
            />
          ))}
        </ListBlock>

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
        icon={<span style={{ color: '#FFB000', fontSize: '18px' }}>&#128221;</span>}
        title="Note"
      />
      <div className="px-4 pb-4" style={{ color: '#A0A0A0' }}>
        {message || 'Note action completed'}
      </div>
    </Card>
  )
}
