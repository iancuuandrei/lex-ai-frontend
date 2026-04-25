import { Link } from 'react-router-dom'
import heroImg from '../assets/hero.png'

function HomePage() {
  return (
    <section className="page page-home">
      <div className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Simple routed app shell</span>
          <h1>Start every legal workflow from one calm workspace.</h1>
          <p>
            This is a clean home route for the app, with a shared navbar and room
            to grow into search, drafting, or legislation lookup flows.
          </p>
          <div className="hero-actions">
            <Link className="primary-action" to="/assistant">
              Open assistant
            </Link>
            <Link className="secondary-action" to="/library">
              Browse library
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <img src={heroImg} alt="Abstract Lex AI illustration" />
        </div>
      </div>

      <div className="page-grid">
        <article className="info-card">
          <h2>Fast navigation</h2>
          <p>
            Routes are set up with React Router so it stays easy to add new views
            without reworking the layout later.
          </p>
        </article>
        <article className="info-card">
          <h2>Shared layout</h2>
          <p>
            The navbar lives in a reusable shell, so every page automatically gets
            the same top-level structure.
          </p>
        </article>
        <article className="info-card">
          <h2>Ready to extend</h2>
          <p>
            Each page is its own component, which keeps the project tidy as the
            frontend grows.
          </p>
        </article>
      </div>
    </section>
  )
}

export default HomePage
