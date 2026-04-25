import { Link, Outlet, useLocation } from 'react-router-dom'
import brandLogo from '../../LoDi-LoDi-Capital_letter_L_featu...-Apr_25_2026_17-01-r2j3avfe-removebg-preview.png.svg'

const navItems = [
  { label: 'Prompt', to: '/assistant' },
  { label: 'Confidentialitate', to: '/library' },
  { label: 'Termeni', to: '/' },
]

function AppLayout() {
  const location = useLocation()
  const isHomeRoute = location.pathname === '/'
  const isStudioRoute = location.pathname === '/graph'
    || location.pathname === '/product'
    || location.pathname === '/canvas'

  return (
    <div className={`app-shell${isHomeRoute ? ' app-shell--home' : ''}${isStudioRoute ? ' app-shell--studio' : ''}`}>
      {!isStudioRoute ? (
        <header className="navbar">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <img src={brandLogo} alt="" aria-hidden="true" />
            </span>
            <strong className="brand-wordmark">LexAi</strong>
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
      ) : null}

      <main className={`page-shell${isStudioRoute ? ' page-shell--studio' : ''}`}>
        <Outlet />
      </main>

      {!isStudioRoute ? (
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
      ) : null}
    </div>
  )
}

export default AppLayout
