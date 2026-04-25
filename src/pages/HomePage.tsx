import { useEffect, useState } from 'react'

const promptPrefix = 'Intreaba-l pe LexAi despre '

const promptIdeas = [
  'concediere fara preaviz',
  'mostenire fara testament',
  'clauze dintr-un contract de chirie',
  'contestarea unei amenzi rutiere',
  'ore suplimentare neplatite',
]

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

function HomePage() {
  const [ideaIndex, setIdeaIndex] = useState(0)
  const [typedIdea, setTypedIdea] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isIntroVisible, setIsIntroVisible] = useState(false)
  const [promptValue, setPromptValue] = useState('')

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsIntroVisible(true)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

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
  }, [ideaIndex, isDeleting, typedIdea])

  return (
    <section
      className={`page page-home${isIntroVisible ? ' page-home--intro-visible' : ''}`}
    >
      <div className="hero-stack">
        <div className="hero-copy">
          <h1>
            Descrii cazul,
            <br />
            vezi baza legala.
          </h1>
          <p>
            LexGraph iti arata raspunsul si articolele care il sustin.
          </p>
        </div>

        <section className="prompt-card" aria-label="Prompt layout preview">
          <div className="prompt-card__frame">
            <div className="prompt-card__editor">
              <label className="prompt-card__input-wrap">
                <span className="sr-only">Prompt</span>
                <textarea
                  className="prompt-card__input"
                  value={promptValue}
                  onChange={(event) => setPromptValue(event.target.value)}
                  rows={2}
                  aria-label="Prompt"
                />
                {promptValue.length === 0 ? (
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
              >
                <ArrowUpIcon />
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}

export default HomePage
