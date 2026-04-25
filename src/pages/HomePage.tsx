function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m5.5 7.5 4.5 5 4.5-5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MicrophoneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 12.8a2.8 2.8 0 0 0 2.8-2.8V6.7A2.8 2.8 0 0 0 10 4a2.8 2.8 0 0 0-2.8 2.7V10A2.8 2.8 0 0 0 10 12.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5.8 9.8a4.2 4.2 0 0 0 8.4 0M10 14v2.2M7.4 16.2h5.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 15V5M5.5 9.5 10 5l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HomePage() {
  return (
    <section className="page page-home">
      <div className="hero-stack">
        <div className="hero-copy">
          <h1>
            Intrebi firesc,
            <br />
            verifici in drept.
          </h1>
          <p>
            Descrii speta in limbaj natural, iar LexGraph iti intoarce un
            raspuns clar, legat de articolele si conexiunile care il sustin.
          </p>
        </div>

        <section className="prompt-card" aria-label="Prompt layout preview">
          <div className="prompt-card__frame">
            <div className="prompt-card__editor">
              <span className="prompt-card__placeholder">
                Descrie situatia juridica pe care vrei sa o intelegi sau sa o
                verifici...
              </span>
            </div>

            <div className="prompt-card__toolbar">
              <button
                className="prompt-icon-button prompt-icon-button-muted"
                type="button"
                aria-label="Add item"
              >
                <span>+</span>
              </button>

              <div className="prompt-toolbar__actions">
                <button className="prompt-mode-button" type="button">
                  <span>Analizeaza</span>
                  <ChevronDownIcon />
                </button>

                <button className="prompt-icon-button" type="button" aria-label="Use microphone">
                  <MicrophoneIcon />
                </button>

                <button
                  className="prompt-icon-button prompt-icon-button-primary"
                  type="button"
                  aria-label="Send prompt"
                >
                  <ArrowUpIcon />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}

export default HomePage
