import { useEffect, useRef, useCallback, useState } from 'react'
import { CrayonChat } from '@crayonai/react-ui'
import { useThreadManager } from '@crayonai/react-core'
import type { Message, ResponseTemplate } from '@crayonai/react-core'
import { deepkitDarkTheme } from './theme'
import { TaskListTemplate } from './templates/TaskListTemplate'
import { SystemStatusTemplate } from './templates/SystemStatusTemplate'
import { NoteTemplate } from './templates/NoteTemplate'
import { WorkflowTemplate } from './templates/WorkflowTemplate'
import { ChatTemplate } from './templates/ChatTemplate'
import { ErrorTemplate } from './templates/ErrorTemplate'
import { SuggestionsTemplate } from './templates/SuggestionsTemplate'
import { ServiceGridTemplate } from './templates/ServiceGridTemplate'
import { WelcomeWizardTemplate } from './templates/WelcomeWizardTemplate'
import { ArtifactPanel, ArtifactState } from './components/ArtifactPanel'

// ============================================
// Response Template Registry
// ============================================

const responseTemplates: ResponseTemplate[] = [
  { name: 'task_list', Component: TaskListTemplate },
  { name: 'system_status', Component: SystemStatusTemplate },
  { name: 'note', Component: NoteTemplate },
  { name: 'workflow', Component: WorkflowTemplate },
  { name: 'chat', Component: ChatTemplate },
  { name: 'error', Component: ErrorTemplate },
  { name: 'suggestions', Component: SuggestionsTemplate },
  { name: 'service_grid', Component: ServiceGridTemplate },
  { name: 'welcome_wizard', Component: WelcomeWizardTemplate },
  { name: 'file', Component: ChatTemplate },
  { name: 'web', Component: ChatTemplate },
  { name: 'calendar', Component: ChatTemplate },
  { name: 'tool_result', Component: ChatTemplate },
]

// Template types that should open in the artifact panel
const ARTIFACT_TYPES = new Set([
  'task_list',
  'system_status',
  'note',
  'workflow',
  'service_grid',
  'hardware_metrics',
  'welcome_wizard',
])

let msgCounter = 0
const nextId = () => `msg-${Date.now()}-${++msgCounter}`

// Persistent user ID (survives refresh)
const USER_ID = (() => {
  let id = localStorage.getItem('deepkit-user-id')
  if (!id) {
    id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem('deepkit-user-id', id)
  }
  return id
})()

// ============================================
// SSE Stream Parser
// ============================================

type SSEEvent = { event: string; data: any }

function parseSSEChunk(buffer: string): { events: SSEEvent[]; remaining: string } {
  const events: SSEEvent[] = []
  const blocks = buffer.split('\n\n')
  const remaining = blocks.pop() || '' // incomplete block stays in buffer

  for (const block of blocks) {
    if (!block.trim()) continue
    const lines = block.split('\n')
    let eventName = ''
    let data = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) eventName = line.slice(7)
      else if (line.startsWith('data: ')) data = line.slice(6)
    }
    if (eventName && data) {
      try {
        events.push({ event: eventName, data: JSON.parse(data) })
      } catch { /* skip malformed */ }
    }
  }

  return { events, remaining }
}

// ============================================
// Build message parts from structured response
// ============================================

type MsgPart = { type: 'text'; text: string } | { type: 'template'; name: string; templateProps: any }

function buildTemplateParts(structured: any): MsgPart[] {
  const parts: MsgPart[] = []

  parts.push({
    type: 'template',
    name: structured.type,
    templateProps: {
      data: structured.data || {},
      tool: structured.tool || null,
      duration: structured.duration || null,
      success: structured.success ?? true,
    },
  })

  // Append follow-up suggestions if available
  if (structured.suggestions?.length) {
    parts.push({
      type: 'template',
      name: 'suggestions',
      templateProps: {
        data: { suggestions: structured.suggestions },
      },
    })
  }

  return parts
}

// ============================================
// App Component
// ============================================

// Setup status type
interface SetupStatus {
  firstRun: boolean
  ollama: boolean
  models: string[]
  servicesCount: number
  postgres: boolean
}

function App() {
  const threadManagerRef = useRef<any>(null)
  const [artifact, setArtifact] = useState<ArtifactState | null>(null)
  const [setupChecked, setSetupChecked] = useState(false)

  // Check for first-run on mount
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/setup/status')
        const status: SetupStatus = await res.json()

        if (status.firstRun) {
          // Show welcome wizard in artifact panel
          setArtifact({
            type: 'welcome_wizard',
            name: 'Welcome',
            templateProps: {
              data: status,
              onComplete: () => setArtifact(null),
            },
          })
        }
      } catch (error) {
        console.warn('Could not check setup status:', error)
      }
      setSetupChecked(true)
    }

    checkSetup()
  }, [])

  // Handle artifact updates from tool results
  const handleArtifact = useCallback((structured: any) => {
    if (ARTIFACT_TYPES.has(structured.type)) {
      setArtifact({
        type: structured.type,
        name: structured.name || structured.type,
        templateProps: {
          data: structured.data || {},
          tool: structured.tool || null,
          duration: structured.duration || null,
          success: structured.success ?? true,
        },
      })
    }
  }, [])

  // Feature 3: Load conversation history from backend
  const loadThread = useCallback(async (): Promise<Message[]> => {
    try {
      const res = await fetch(`/api/conversations/${USER_ID}`)
      const data = await res.json()
      if (data.messages?.length) {
        return data.messages
      }
    } catch { /* no history available */ }
    return []
  }, [])

  const threadManager = useThreadManager({
    threadId: null,
    loadThread,
    responseTemplates,

    // Feature 1: SSE streaming + Feature 2: Suggestions + Feature 5: Multi-tool
    onProcessMessage: async ({ message, threadManager: tm, abortController }) => {
      const userText = message.message || ''
      threadManagerRef.current = tm

      try {
        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userText, from: USER_ID }),
          signal: abortController?.signal,
        })

        if (!res.ok || !res.body) {
          // Fallback to non-streaming endpoint
          const fallback = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText, from: USER_ID }),
            signal: abortController?.signal,
          })
          const data = await fallback.json()

          if (data.structured?.type) {
            handleArtifact(data.structured)
            return [{ id: nextId(), role: 'assistant', message: buildTemplateParts(data.structured) }]
          }
          return [{ id: nextId(), role: 'assistant', message: [{ type: 'text', text: data.response || 'No response' }] }]
        }

        // Read SSE stream
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let streamingMsgId: string | null = null
        const collectedResults: MsgPart[][] = []
        let finalSuggestions: string[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const { events, remaining } = parseSSEChunk(buffer)
          buffer = remaining

          for (const evt of events) {
            switch (evt.event) {
              case 'tool_result': {
                // Structured tool response — render template + update artifact
                const structured = evt.data.structured
                if (structured) {
                  handleArtifact(structured)
                  collectedResults.push(buildTemplateParts(structured))
                }
                break
              }

              case 'stream_start': {
                // LLM is generating text — create streaming message
                streamingMsgId = nextId()
                tm.appendMessages({
                  id: streamingMsgId,
                  role: 'assistant',
                  message: [{ type: 'text', text: '' }],
                })
                break
              }

              case 'token': {
                // Progressive text update
                if (streamingMsgId && evt.data.fullText) {
                  tm.updateMessage({
                    id: streamingMsgId,
                    role: 'assistant',
                    message: [{ type: 'text', text: evt.data.fullText }],
                  })
                }
                break
              }

              case 'tool_executing': {
                // LLM decided to use a tool mid-stream — update indicator
                if (streamingMsgId) {
                  tm.updateMessage({
                    id: streamingMsgId,
                    role: 'assistant',
                    message: [{ type: 'text', text: `Executing ${evt.data.tool}...` }],
                  })
                }
                break
              }

              case 'multi_start': {
                // Multi-tool composition starting
                streamingMsgId = nextId()
                tm.appendMessages({
                  id: streamingMsgId,
                  role: 'assistant',
                  message: [{ type: 'text', text: `Running ${evt.data.count} tools...` }],
                })
                break
              }

              case 'done': {
                // Finalize — collect suggestions from done event
                if (evt.data.suggestions?.length) {
                  finalSuggestions = evt.data.suggestions
                }

                // If done has structured data (LLM resolved to tool after streaming)
                if (evt.data.structured) {
                  const structured = evt.data.structured
                  handleArtifact(structured)
                  if (streamingMsgId) {
                    // Replace the streaming message with the template
                    tm.updateMessage({
                      id: streamingMsgId,
                      role: 'assistant',
                      message: buildTemplateParts(structured),
                    })
                    streamingMsgId = null
                  } else {
                    collectedResults.push(buildTemplateParts(structured))
                  }
                }
                break
              }

              case 'error': {
                const errorPart: MsgPart = {
                  type: 'template',
                  name: 'error',
                  templateProps: {
                    data: {
                      message: evt.data.message || 'Stream error',
                      code: 'STREAM_ERROR',
                    },
                  },
                }
                if (streamingMsgId) {
                  tm.updateMessage({
                    id: streamingMsgId,
                    role: 'assistant',
                    message: [errorPart],
                  })
                  streamingMsgId = null
                } else {
                  return [{ id: nextId(), role: 'assistant', message: [errorPart] }]
                }
                break
              }
            }
          }
        }

        // If we streamed text and have suggestions, add them to the final message
        if (streamingMsgId && finalSuggestions.length) {
          // Read current message text from the update
          const currentMsg = tm.messages?.find((m: Message) => m.id === streamingMsgId)
          const currentParts = (currentMsg as any)?.message || []
          tm.updateMessage({
            id: streamingMsgId,
            role: 'assistant',
            message: [
              ...currentParts,
              {
                type: 'template',
                name: 'suggestions',
                templateProps: { data: { suggestions: finalSuggestions } },
              },
            ],
          })
          return [] // message already managed via threadManager
        }

        // If we streamed text (no suggestions), message is already in place
        if (streamingMsgId) {
          return []
        }

        // If we collected tool results (not streamed), return as messages
        if (collectedResults.length > 0) {
          // Add suggestions to the last result
          if (finalSuggestions.length) {
            const lastParts = collectedResults[collectedResults.length - 1]
            lastParts.push({
              type: 'template',
              name: 'suggestions',
              templateProps: { data: { suggestions: finalSuggestions } },
            })
          }

          return collectedResults.map((parts) => ({
            id: nextId(),
            role: 'assistant' as const,
            message: parts,
          }))
        }

        return []
      } catch (err: any) {
        if (err.name === 'AbortError') return []
        return [{
          id: nextId(),
          role: 'assistant',
          message: [{
            type: 'template',
            name: 'error',
            templateProps: {
              data: {
                message: err.message || 'Connection failed',
                code: 'NETWORK_ERROR',
              },
            },
          }],
        }]
      }
    },
  })

  // Feature 2: Handle suggestion clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent).detail?.text
      if (text && threadManager) {
        threadManager.processMessage({
          role: 'user',
          type: 'prompt',
          message: text,
        })
      }
    }
    window.addEventListener('deepkit-suggestion', handler)
    return () => window.removeEventListener('deepkit-suggestion', handler)
  }, [threadManager])

  // Feature 4: Real-time event notifications via SSE
  useEffect(() => {
    let eventSource: EventSource | null = null

    const connect = () => {
      eventSource = new EventSource('/api/events/stream')

      eventSource.addEventListener('notification', (e) => {
        try {
          const data = JSON.parse(e.data)
          // Inject as an assistant message
          if (threadManagerRef.current) {
            threadManagerRef.current.appendMessages({
              id: nextId(),
              role: 'assistant',
              message: [{ type: 'text', text: `[Event] ${data.message || data.type || 'Notification'}` }],
            })
          }
        } catch { /* ignore */ }
      })

      eventSource.addEventListener('service_event', (e) => {
        try {
          const data = JSON.parse(e.data)
          if (threadManagerRef.current) {
            threadManagerRef.current.appendMessages({
              id: nextId(),
              role: 'assistant',
              message: [{
                type: 'text',
                text: `[${data.service || 'System'}] ${data.message || data.event || 'Event received'}`,
              }],
            })
          }
        } catch { /* ignore */ }
      })

      eventSource.onerror = () => {
        eventSource?.close()
        // Reconnect after 5s
        setTimeout(connect, 5000)
      }
    }

    connect()
    return () => { eventSource?.close() }
  }, [])

  const hasArtifact = artifact !== null

  return (
    <div className="split-panel-container">
      {/* Chat Panel */}
      <div className={`chat-panel ${hasArtifact ? 'with-artifact' : ''}`}>
        <CrayonChat
          type="standalone"
          threadManager={threadManager}
          theme={{
            mode: 'dark',
            darkTheme: deepkitDarkTheme as any,
          }}
          welcomeMessage={{
            title: 'DeepKit Core',
            description: 'Your sovereign AI command center. Execute commands, create workflows, and manage your data — all locally.',
          }}
          conversationStarters={{
            variant: 'long',
            options: [
              { displayText: 'System Status', prompt: 'System status' },
              { displayText: 'List Tasks', prompt: 'List my tasks' },
              { displayText: 'Show Workflows', prompt: 'Show my workflows' },
              { displayText: 'Brief Me', prompt: 'Give me a summary' },
            ],
          }}
          messageLoadingComponent={() => (
            <div className="flex items-center gap-2 px-4 py-3">
              <div
                className="w-2 h-2 animate-pulse"
                style={{ backgroundColor: '#00F2FF', borderRadius: '50%' }}
              />
              <span style={{ color: '#A0A0A0', fontSize: '13px' }}>
                Processing...
              </span>
            </div>
          )}
        />
      </div>

      {/* Artifact Panel - only visible when artifact is present */}
      {hasArtifact && (
        <ArtifactPanel
          artifact={artifact}
          onClose={() => setArtifact(null)}
        />
      )}
    </div>
  )
}

export default App
