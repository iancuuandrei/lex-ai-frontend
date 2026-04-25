import { Link, Outlet } from 'react-router-dom'

const navItems = [
  { label: 'Overview', to: '/' },
  { label: 'Assistant', to: '/assistant' },
  { label: 'Library', to: '/library' },
  { label: 'Graph', to: '/graph' },
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

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 6h1.6l1.8 8.2a1 1 0 0 0 1 .8h7.3a1 1 0 0 0 1-.7L20 8H8.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.3" cy="18.4" r="1.2" fill="currentColor" />
      <circle cx="17.2" cy="18.4" r="1.2" fill="currentColor" />
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
          <button className="nav-icon-button" type="button" aria-label="Open cart">
            <CartIcon />
          </button>
          <button className="nav-icon-button nav-icon-button-solid" type="button" aria-label="Open profile">
            <span className="nav-icon-core" />
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
