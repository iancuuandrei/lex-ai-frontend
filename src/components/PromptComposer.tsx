import { useEffect, useState } from 'react'

interface PromptComposerProps {
  promptPrefix: string
  promptIdeas: string[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 18V6M7 11l5-5 5 5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PromptComposer({
  promptPrefix,
  promptIdeas,
  value,
  onChange,
  ariaLabel,
  className = '',
}: PromptComposerProps) {
  const [ideaIndex, setIdeaIndex] = useState(0)
  const [typedIdea, setTypedIdea] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentIdea = promptIdeas[ideaIndex]
    const isComplete = typedIdea === currentIdea
    const isEmpty = typedIdea.length === 0

    const delay = isDeleting ? (isEmpty ? 240 : 36) : isComplete ? 1500 : 72

    const timeoutId = window.setTimeout(() => {
      if (!isDeleting) {
        if (isComplete) {
          setIsDeleting(true)
          return
        }

        setTypedIdea(currentIdea.slice(0, typedIdea.length + 1))
        return
      }

      if (!isEmpty) {
        setTypedIdea(currentIdea.slice(0, typedIdea.length - 1))
        return
      }

      setIsDeleting(false)
      setIdeaIndex((currentIndex) => (currentIndex + 1) % promptIdeas.length)
    }, delay)

    return () => window.clearTimeout(timeoutId)
  }, [ideaIndex, isDeleting, promptIdeas, typedIdea])

  return (
    <section className={`prompt-card${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      <div className="prompt-card__frame">
        <div className="prompt-card__editor">
          <label className="prompt-card__input-wrap">
            <span className="sr-only">{ariaLabel}</span>
            <textarea
              className="prompt-card__input"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={2}
              aria-label={ariaLabel}
            />
            {value.length === 0 ? (
              <span className="prompt-card__placeholder">
                <span className="prompt-card__placeholder-prefix">
                  {promptPrefix}
                </span>
                <span className="prompt-card__placeholder-text">
                  {typedIdea}
                </span>
                <span className="prompt-card__cursor" aria-hidden="true">
                  |
                </span>
              </span>
            ) : null}
          </label>
        </div>

        <div className="prompt-card__toolbar">
          <button
            className="prompt-icon-button prompt-icon-button-primary"
            type="button"
            aria-label="Send prompt"
            disabled={value.trim().length === 0}
          >
            <ArrowUpIcon />
          </button>
        </div>
      </div>
    </section>
  )
}
