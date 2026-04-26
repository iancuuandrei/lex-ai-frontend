import { useEffect, useState } from 'react'
import { getSuggestions } from '../lib/api'
import type { Suggestion } from '../types/lexai'

function AssistantPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSuggestions()
      .then(setSuggestions)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="page">
      <div className="section-header">
        <span className="eyebrow">Assistant route</span>
        <h1>Ask the assistant</h1>
        <p>
          This page can become your prompt workspace, with room for uploads,
          conversation history, and cited answers.
        </p>
      </div>

      <div className="page-grid">
        <article className="info-card">
          <h2>Starter prompts</h2>
          {loading ? (
            <p>Loading suggestions...</p>
          ) : (
            <ul className="simple-list">
              {suggestions.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          )}
        </article>
        <article className="info-card">
          <h2>Why this route exists</h2>
          <p>
            Keeping the assistant on its own route makes it easy to later support
            deep links, page-specific loading states, and route guards.
          </p>
        </article>
      </div>
    </section>
  )
}

export default AssistantPage
