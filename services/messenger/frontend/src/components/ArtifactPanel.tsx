import React from 'react'
import { TaskListTemplate } from '../templates/TaskListTemplate'
import { SystemStatusTemplate } from '../templates/SystemStatusTemplate'
import { NoteTemplate } from '../templates/NoteTemplate'
import { WorkflowTemplate } from '../templates/WorkflowTemplate'
import { ErrorTemplate } from '../templates/ErrorTemplate'
import { ServiceGridTemplate } from '../templates/ServiceGridTemplate'
import { WelcomeWizardTemplate } from '../templates/WelcomeWizardTemplate'

/**
 * Artifact state passed from chat responses
 */
export interface ArtifactState {
  type: string
  name: string
  templateProps: {
    data: any
    tool?: string | null
    duration?: string | null
    success?: boolean
  }
}

interface ArtifactPanelProps {
  artifact: ArtifactState | null
  onClose: () => void
}

/**
 * Map of template types to their display names
 */
const templateNames: Record<string, string> = {
  task_list: 'Task List',
  system_status: 'System Status',
  note: 'Note',
  workflow: 'Workflow',
  error: 'Error Details',
  service_grid: 'Services',
  hardware_metrics: 'Hardware Metrics',
  welcome_wizard: 'Welcome',
}

/**
 * Map of template types to their components
 */
const templateComponents: Record<string, React.FC<any>> = {
  task_list: TaskListTemplate,
  system_status: SystemStatusTemplate,
  note: NoteTemplate,
  workflow: WorkflowTemplate,
  error: ErrorTemplate,
  service_grid: ServiceGridTemplate,
  welcome_wizard: WelcomeWizardTemplate,
}

/**
 * Close icon SVG
 */
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Empty state icon
 */
const EmptyIcon = () => (
  <svg className="artifact-empty-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="10" width="36" height="28" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M6 18H42" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="14" r="1.5" fill="currentColor" />
    <circle cx="17" cy="14" r="1.5" fill="currentColor" />
    <circle cx="22" cy="14" r="1.5" fill="currentColor" />
    <rect x="12" y="24" width="24" height="2" rx="1" fill="currentColor" opacity="0.5" />
    <rect x="12" y="30" width="16" height="2" rx="1" fill="currentColor" opacity="0.5" />
  </svg>
)

/**
 * ArtifactPanel - Right panel for displaying rich generative UI outputs
 *
 * Renders templates at full panel width with a header bar containing
 * the artifact name and close button.
 */
export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose }) => {
  // Empty state
  if (!artifact) {
    return (
      <div className="artifact-panel">
        <div className="artifact-empty">
          <EmptyIcon />
          <div className="artifact-empty-title">Artifact Panel</div>
          <div className="artifact-empty-desc">
            Rich outputs from tools and commands will appear here.
            Try "System status" or "List my tasks" to get started.
          </div>
        </div>
      </div>
    )
  }

  const { type, name, templateProps } = artifact
  const TemplateComponent = templateComponents[type]
  const displayName = name || templateNames[type] || type

  return (
    <div className="artifact-panel animate-fade-in">
      {/* Header */}
      <div className="artifact-header">
        <div className="artifact-title">{displayName}</div>
        <button
          className="artifact-close"
          onClick={onClose}
          aria-label="Close artifact"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Content */}
      <div className="artifact-content">
        {TemplateComponent ? (
          <TemplateComponent {...templateProps} />
        ) : (
          <div style={{ color: '#A0A0A0', padding: '20px' }}>
            Unknown template type: {type}
          </div>
        )}
      </div>
    </div>
  )
}

export default ArtifactPanel
