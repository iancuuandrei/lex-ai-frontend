import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { label: 'Overview', to: '/' },
  { label: 'Assistant', to: '/assistant' },
  { label: 'Library', to: '/library' },
]

function AppLayout() {
  return (
    <div className="app-shell">
      <header className="navbar">
        <NavLink to="/" className="brand">
          <span className="brand-badge">LX</span>
          <span>
            <strong>Lex AI</strong>
            <small>Legal research workspace</small>
          </span>
        </NavLink>

        <nav className="nav-links" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
