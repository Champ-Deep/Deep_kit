import React from 'react'
import { FollowUpBlock, FollowUpItem } from '@crayonai/react-ui'

interface Props {
  data: {
    suggestions: string[]
  }
}

export const SuggestionsTemplate: React.FC<Props> = ({ data }) => {
  const { suggestions } = data
  if (!suggestions?.length) return null

  const handleClick = (text: string) => {
    window.dispatchEvent(new CustomEvent('deepkit-suggestion', { detail: { text } }))
  }

  return (
    <div className="mt-2">
      <FollowUpBlock>
        {suggestions.map((s, i) => (
          <FollowUpItem
            key={i}
            text={s}
            onClick={() => handleClick(s)}
          />
        ))}
      </FollowUpBlock>
    </div>
  )
}
