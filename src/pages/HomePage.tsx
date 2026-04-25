import { useEffect, useState } from 'react'
import PromptComposer from '../components/PromptComposer'

const promptIdeas = [
  'concediere fara preaviz',
  'mostenire fara testament',
  'clauze dintr-un contract de chirie',
  'contestarea unei amenzi rutiere',
  'ore suplimentare neplatite',
]

function HomePage() {
  const [isIntroVisible, setIsIntroVisible] = useState(false)
  const [promptValue, setPromptValue] = useState('')

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsIntroVisible(true)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

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

        <PromptComposer
          promptPrefix="Intreaba-l pe LexAi despre "
          promptIdeas={promptIdeas}
          value={promptValue}
          onChange={setPromptValue}
          ariaLabel="Prompt"
        />
      </div>
    </section>
  )
}

export default HomePage
