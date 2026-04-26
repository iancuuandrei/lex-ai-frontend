import { useEffect, useState } from 'react'
import { getLibrary } from '../lib/api'
import type { LibraryItem } from '../types/lexai'

function LibraryPage() {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLibrary()
      .then(setLibraryItems)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="page">
      <div className="section-header">
        <span className="eyebrow">Library route</span>
        <h1>Organize your research</h1>
        <p>
          This page gives you a second route to validate the navbar flow and a
          natural place for saved documents or indexed materials.
        </p>
      </div>

      <article className="info-card wide-card">
        <h2>Suggested content blocks</h2>
        {loading ? (
          <p>Loading library items...</p>
        ) : (
          <ul className="simple-list">
            {libraryItems.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>: {item.description}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}

export default LibraryPage
