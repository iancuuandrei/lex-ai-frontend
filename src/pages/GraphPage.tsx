const legendNodes = [
  { label: 'Case', color: 'var(--accent)' },
  { label: 'Statute', color: '#7c5cbc' },
  { label: 'Party', color: '#c07a2e' },
  { label: 'Court', color: '#2e7ab5' },
]

function GraphPage() {
  return (
    <section className="page">
      <div className="section-header">
        <span className="eyebrow">Graph Viewer</span>
        <h1>Knowledge Graph</h1>
        <p>Explore relationships between cases, statutes, parties, and courts.</p>
      </div>

      <div className="graph-toolbar info-card">
        <div className="graph-toolbar-search">
          <input
            className="graph-search-input"
            type="text"
            placeholder="Search nodes…"
            aria-label="Search graph nodes"
          />
        </div>
        <div className="graph-toolbar-actions">
          <button className="graph-btn" aria-label="Zoom in">+</button>
          <button className="graph-btn" aria-label="Zoom out">−</button>
          <button className="graph-btn graph-btn-wide" aria-label="Fit view">Fit</button>
          <button className="graph-btn graph-btn-wide" aria-label="Reset">Reset</button>
        </div>
      </div>

      <div className="graph-workspace">
        <div className="graph-canvas info-card">
          <div className="graph-canvas-empty">
            <span className="graph-canvas-icon">⬡</span>
            <p>Graph canvas</p>
            <small>Node data will render here</small>
          </div>
        </div>

        <aside className="graph-sidebar">
          <article className="info-card graph-sidebar-card">
            <h2>Node Detail</h2>
            <p className="graph-empty-hint">Select a node to inspect its properties and connections.</p>
          </article>

          <article className="info-card graph-sidebar-card">
            <h2>Legend</h2>
            <ul className="graph-legend">
              {legendNodes.map((item) => (
                <li key={item.label} className="graph-legend-item">
                  <span className="graph-legend-dot" style={{ background: item.color }} />
                  {item.label}
                </li>
              ))}
            </ul>
          </article>

          <article className="info-card graph-sidebar-card">
            <h2>Filters</h2>
            <ul className="graph-filter-list">
              {legendNodes.map((item) => (
                <li key={item.label} className="graph-filter-item">
                  <label className="graph-filter-label">
                    <input type="checkbox" defaultChecked />
                    <span className="graph-legend-dot" style={{ background: item.color }} />
                    {item.label}
                  </label>
                </li>
              ))}
            </ul>
          </article>
        </aside>
      </div>
    </section>
  )
}

export default GraphPage
