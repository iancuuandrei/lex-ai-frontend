const libraryItems = [
  'Legislation summaries',
  'Saved notes and highlights',
  'Shared research collections',
]

function LibraryPage() {
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
        <ul className="simple-list">
          {libraryItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  )
}

export default LibraryPage
