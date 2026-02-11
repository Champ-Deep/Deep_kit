import React, { useState, useEffect } from 'react'
import { Card, Tag } from '@crayonai/react-ui'

interface SetupStatus {
  firstRun: boolean
  ollama: boolean
  models: string[]
  servicesCount: number
  postgres: boolean
}

interface Props {
  data: SetupStatus
  onComplete?: () => void
}

const steps = [
  { id: 1, title: 'Welcome', icon: '👋' },
  { id: 2, title: 'AI Engine', icon: '🧠' },
  { id: 3, title: 'Services', icon: '⚙️' },
  { id: 4, title: 'Get Started', icon: '🚀' },
]

export const WelcomeWizardTemplate: React.FC<Props> = ({ data, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const { ollama, models = [], servicesCount, postgres } = data

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleComplete = async () => {
    try {
      await fetch('/api/setup/complete', { method: 'POST' })
      onComplete?.()
    } catch (error) {
      console.error('Failed to complete setup:', error)
    }
  }

  return (
    <Card variant="card" width="full">
      <div className="p-6">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center"
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: currentStep >= step.id ? '#00F2FF' : '#1f1f1f',
                  color: currentStep >= step.id ? '#000' : '#A0A0A0',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                }}
              >
                {currentStep > step.id ? '✓' : step.id}
              </div>
              {step.id < steps.length && (
                <div
                  style={{
                    width: '40px',
                    height: '2px',
                    backgroundColor: currentStep > step.id ? '#00F2FF' : '#1f1f1f',
                    transition: 'all 0.3s ease',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[280px]">
          {currentStep === 1 && (
            <WelcomeStep />
          )}
          {currentStep === 2 && (
            <AIEngineStep ollama={ollama} models={models} />
          )}
          {currentStep === 3 && (
            <ServicesStep servicesCount={servicesCount} postgres={postgres} />
          )}
          {currentStep === 4 && (
            <GetStartedStep />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-3 mt-6">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: '1px solid #333',
                backgroundColor: 'transparent',
                color: '#A0A0A0',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Back
            </button>
          )}
          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              style={{
                padding: '10px 32px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#00F2FF',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleComplete}
              style={{
                padding: '10px 32px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#39FF14',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}

const WelcomeStep: React.FC = () => (
  <div className="text-center">
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
    <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#FFFFFF' }}>
      Welcome to DeepKit Core
    </h2>
    <p style={{ color: '#A0A0A0', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
      Your sovereign AI command center. This wizard will help you verify your setup
      and get familiar with the interface.
    </p>
    <div style={{ marginTop: '24px' }}>
      <Tag text="Local First" variant="success" size="sm" />
      <span style={{ margin: '0 8px' }} />
      <Tag text="No Cloud Required" variant="info" size="sm" />
    </div>
  </div>
)

interface AIEngineStepProps {
  ollama: boolean
  models: string[]
}

const AIEngineStep: React.FC<AIEngineStepProps> = ({ ollama, models }) => (
  <div className="text-center">
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
    <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#FFFFFF' }}>
      AI Engine Status
    </h2>

    <div style={{
      padding: '20px',
      borderRadius: '8px',
      backgroundColor: '#0d0d0d',
      border: '1px solid #1f1f1f',
      maxWidth: '360px',
      margin: '0 auto',
    }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ color: '#A0A0A0' }}>Ollama Connection</span>
        <Tag
          text={ollama ? 'Connected' : 'Offline'}
          variant={ollama ? 'success' : 'danger'}
          size="sm"
        />
      </div>

      {models.length > 0 ? (
        <div>
          <div style={{ color: '#A0A0A0', marginBottom: '8px', fontSize: '13px' }}>
            Available Models:
          </div>
          <div className="flex flex-wrap gap-2">
            {models.map((model) => (
              <Tag key={model} text={model} variant="info" size="sm" />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ color: '#A0A0A0', fontSize: '13px' }}>
          No models detected. Pull a model with:
          <code style={{
            display: 'block',
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#000',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#00F2FF',
          }}>
            ollama pull llama3.2
          </code>
        </div>
      )}
    </div>
  </div>
)

interface ServicesStepProps {
  servicesCount: number
  postgres: boolean
}

const ServicesStep: React.FC<ServicesStepProps> = ({ servicesCount, postgres }) => (
  <div className="text-center">
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
    <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#FFFFFF' }}>
      Your Services
    </h2>

    <div style={{
      padding: '20px',
      borderRadius: '8px',
      backgroundColor: '#0d0d0d',
      border: '1px solid #1f1f1f',
      maxWidth: '360px',
      margin: '0 auto',
    }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ color: '#A0A0A0' }}>Database</span>
        <Tag
          text={postgres ? 'Connected' : 'Offline'}
          variant={postgres ? 'success' : 'danger'}
          size="sm"
        />
      </div>

      <div className="flex items-center justify-between">
        <span style={{ color: '#A0A0A0' }}>Services Running</span>
        <Tag
          text={`${servicesCount} active`}
          variant={servicesCount > 0 ? 'success' : 'neutral'}
          size="sm"
        />
      </div>
    </div>

    <p style={{ color: '#A0A0A0', marginTop: '20px', fontSize: '13px' }}>
      You can add more services with presets:<br />
      <code style={{ color: '#00F2FF' }}>./install.sh --preset developer</code>
    </p>
  </div>
)

const GetStartedStep: React.FC = () => (
  <div className="text-center">
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
    <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#FFFFFF' }}>
      Ready to Go!
    </h2>
    <p style={{ color: '#A0A0A0', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.6 }}>
      DeepKit Core is configured. Try these commands to get started:
    </p>

    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '280px',
      margin: '0 auto',
    }}>
      {[
        { text: 'System status', desc: 'Check system health' },
        { text: 'List my tasks', desc: 'View your tasks' },
        { text: 'Show services', desc: 'See running services' },
        { text: 'Brief me', desc: 'Get a summary' },
      ].map((item) => (
        <div
          key={item.text}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#0d0d0d',
            border: '1px solid #1f1f1f',
            textAlign: 'left',
          }}
        >
          <div style={{ color: '#00F2FF', fontWeight: 500, marginBottom: '2px' }}>
            "{item.text}"
          </div>
          <div style={{ color: '#A0A0A0', fontSize: '12px' }}>
            {item.desc}
          </div>
        </div>
      ))}
    </div>
  </div>
)

export default WelcomeWizardTemplate
