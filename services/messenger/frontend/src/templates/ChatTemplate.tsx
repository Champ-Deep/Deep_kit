import React from 'react'
import { MarkDownRenderer } from '@crayonai/react-ui'

interface ChatData {
  text: string
  isStreaming?: boolean
}

interface Props {
  data: ChatData
  tool?: string | null
  duration?: string | null
  success?: boolean
}

export const ChatTemplate: React.FC<Props> = ({ data }) => {
  const { text } = data

  return (
    <MarkDownRenderer
      textMarkdown={text || ''}
      variant="clear"
    />
  )
}
