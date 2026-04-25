import { Link, Outlet } from 'react-router-dom'

const navItems = [
  { label: 'Prompt', to: '/assistant' },
  { label: 'Confidentialitate', to: '/library' },
  { label: 'Termeni', to: '/' },
]

function BrandIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M11.8 4.4 4.4 11.8a4 4 0 0 0 0 5.7l7.1 7.1a4 4 0 0 0 5.6 0l7.5-7.5a4 4 0 0 0 0-5.6l-7.1-7.1a4 4 0 0 0-5.7 0Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="24.8" cy="24.8" r="3" fill="currentColor" />
    </svg>
  )
}

function AppLayout() {
  return (
    <div className="app-shell">
      <header className="navbar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <BrandIcon />
          </span>
          <strong>LEXGRAPH</strong>
        </Link>

        <nav aria-label="Main navigation">
          <ul className="nav-links">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link to={item.to} className="nav-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav-actions" aria-label="Header actions">
          <button className="nav-cta-button" type="button">
            Log in
          </button>
          <button className="nav-cta-button nav-cta-button-primary" type="button">
            Get started
          </button>
        </div>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p className="footer-copy">
          LexGraph organizeaza informatia juridica pentru orientare rapida.
          Decizia finala ramane la profesionistul care semneaza opinia sau
          procedura.
        </p>

        <div className="footer-links">
          <Link to="/library">Confidentialitate</Link>
          <Link to="/">Termeni</Link>
          <a href="mailto:contact@lexgraph.ro">contact@lexgraph.ro</a>
        </div>
      </footer>
    </div>
  )
}

export default AppLayout
