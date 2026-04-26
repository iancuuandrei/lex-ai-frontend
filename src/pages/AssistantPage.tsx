import { useEffect, useState } from 'react'
import { getHealth, postQuery } from '../lib/api'
import type {
  Citation,
  EvidenceUnit,
  QueryRequest,
  QueryResponse,
  VerifierPayload,
} from '../types/lexai'

const DEMO_QUESTION =
  'Poate angajatorul să-mi scadă salariul fără act adițional?'

const INSUFFICIENT_EVIDENCE_WARNINGS = new Set([
  'raw_retrieval_unavailable',
  'database_unavailable',
  'evidence_pack_no_ranked_candidates',
  'generation_insufficient_evidence',
  'verifier_insufficient_evidence',
  'answer_refused_insufficient_evidence',
])

const RETRIEVAL_UNAVAILABLE_WARNINGS = new Set([
  'raw_retrieval_unavailable',
  'database_unavailable',
])

const PIPELINE_STEPS = [
  'Query understanding',
  'Retrieval',
  'Evidence',
  'Verifier',
  'Rendering',
]

type HealthStatus = 'checking' | 'online' | 'offline'

interface AssistantError {
  friendly: string
  raw: string
}

function getRawErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function getFriendlyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Cannot reach LexAI backend')
  ) {
    return 'Nu pot contacta backend-ul LexAI. Verifică dacă FastAPI rulează pe 127.0.0.1:8010 și dacă VITE_API_BASE_URL este corect.'
  }

  if (message.includes('(422)')) {
    return 'Întrebarea nu a trecut validarea backend-ului. Verifică dacă textul nu este prea scurt și dacă requestul folosește jurisdiction=RO, date=current, mode=strict_citations.'
  }

  if (message.includes('(500)')) {
    return 'Backend-ul a returnat o eroare internă. Verifică terminalul FastAPI pentru stack trace și conexiunea la baza de date.'
  }

  if (message.includes('query_not_found')) {
    return 'Query-ul nu mai este disponibil în store-ul backend. Reîncearcă întrebarea.'
  }

  return message
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getRawCandidatesCount(debug: QueryResponse['debug']) {
  if (!isRecord(debug)) {
    return null
  }

  const retrieval = debug.retrieval
  if (!isRecord(retrieval)) {
    return null
  }

  const responseSummary = retrieval.response_summary
  if (!isRecord(responseSummary)) {
    return null
  }

  const candidateCount = responseSummary.candidate_count
  return typeof candidateCount === 'number' || typeof candidateCount === 'string'
    ? candidateCount
    : null
}

function getCombinedWarnings(response: QueryResponse) {
  return [
    ...(response.warnings ?? []),
    ...(response.verifier?.warnings ?? []),
  ]
}

function hasAnyWarning(warnings: string[], warningSet: Set<string>) {
  return warnings.some((warning) => warningSet.has(warning))
}

function getCitationKey(citation: Citation, index: number) {
  return (
    citation.citation_id ??
    citation.id ??
    citation.legal_unit_id ??
    citation.unit_id ??
    `citation-${index}`
  )
}

function getCitationUnitId(citation: Citation) {
  return (
    citation.legal_unit_id ??
    citation.unit_id ??
    citation.evidence_unit_id ??
    'unknown'
  )
}

function getCitationUrl(citation: Citation) {
  return citation.source_url ?? citation.url ?? null
}

function getEvidenceUnitKeys(unit: EvidenceUnit) {
  return [unit.id, unit.unit_id, unit.node_id].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  )
}

function getCitationEvidenceText(
  citation: Citation,
  evidenceUnits: EvidenceUnit[],
) {
  const citationKeys = [
    citation.legal_unit_id,
    citation.unit_id,
    citation.evidence_unit_id,
    citation.node_id,
  ].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  )

  const matchedEvidence = evidenceUnits.find((unit) =>
    getEvidenceUnitKeys(unit).some((key) => citationKeys.includes(key)),
  )

  return matchedEvidence?.raw_text ?? null
}

function renderVerifiedBadge(verified: Citation['verified']) {
  if (verified === true) {
    return (
      <span className="assistant-badge assistant-badge--verified">
        Verificat
      </span>
    )
  }
  if (verified === false) {
    return (
      <span className="assistant-badge assistant-badge--warning">
        Neverificat
      </span>
    )
  }
  return <span className="assistant-badge">Status necunoscut</span>
}

function getEvidenceLocation(unit: EvidenceUnit) {
  const parts = [
    unit.article_number != null && unit.article_number !== ''
      ? `art. ${unit.article_number}`
      : null,
    unit.paragraph_number != null && unit.paragraph_number !== ''
      ? `alin. (${unit.paragraph_number})`
      : null,
    unit.letter_number != null && unit.letter_number !== ''
      ? `lit. ${unit.letter_number})`
      : null,
    unit.point_number != null && unit.point_number !== ''
      ? `pct. ${unit.point_number}`
      : null,
  ].filter(Boolean)
  return parts.join(', ')
}

function formatScore(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) {
    return null
  }
  return score.toFixed(3)
}

function CitationCardItem({
  citation,
  index,
  evidenceUnits,
}: {
  citation: Citation
  index: number
  evidenceUnits: EvidenceUnit[]
}) {
  const unitId = getCitationUnitId(citation)
  const text = getCitationEvidenceText(citation, evidenceUnits)
  const url = getCitationUrl(citation)
  const label = citation.label ?? citation.title ?? citation.act_title ?? null

  return (
    <li className="assistant-citation-card">
      <div className="assistant-meta-row">
        <strong>{label ?? `Citare #${index + 1}`}</strong>
        {renderVerifiedBadge(citation.verified)}
      </div>
      <div className="assistant-meta-row">
        <span>unit_id:</span> <code>{unitId}</code>
      </div>
      {text ? (
        <blockquote className="assistant-legal-text">{text}</blockquote>
      ) : (
        <p className="assistant-empty">
          Textul citabil pentru această citare nu a fost găsit în
          evidence_units[*].raw_text.
        </p>
      )}
      {url ? (
        <div className="assistant-meta-row">
          <a href={url} target="_blank" rel="noreferrer noopener">
            {url}
          </a>
        </div>
      ) : null}
    </li>
  )
}

function EvidenceCardItem({ unit }: { unit: EvidenceUnit }) {
  const location = getEvidenceLocation(unit)
  const retrieval = formatScore(unit.retrieval_score)
  const rerank = formatScore(unit.rerank_score)
  const url = unit.source_url ?? null

  return (
    <li className="assistant-evidence-card">
      <div className="assistant-meta-row">
        <strong>
          <code>{unit.id}</code>
        </strong>
        {unit.support_role ? (
          <span className="assistant-badge">{unit.support_role}</span>
        ) : null}
      </div>
      {unit.law_title ? (
        <div className="assistant-meta-row">{unit.law_title}</div>
      ) : null}
      {location ? (
        <div className="assistant-meta-row">{location}</div>
      ) : null}
      {retrieval || rerank ? (
        <div className="assistant-meta-row">
          {retrieval ? <span>retrieval: {retrieval}</span> : null}
          {retrieval && rerank ? <span> · </span> : null}
          {rerank ? <span>rerank: {rerank}</span> : null}
        </div>
      ) : null}
      {unit.raw_text ? (
        <blockquote className="assistant-legal-text">
          {unit.raw_text}
        </blockquote>
      ) : (
        <p className="assistant-empty">
          Această unitate nu include raw_text în răspunsul backend.
        </p>
      )}
      {unit.why_selected ? (
        <p className="assistant-why-selected">
          <em>{unit.why_selected}</em>
        </p>
      ) : null}
      {url ? (
        <div className="assistant-meta-row">
          <a href={url} target="_blank" rel="noreferrer noopener">
            {url}
          </a>
        </div>
      ) : null}
    </li>
  )
}

function formatGroundedness(score: number | null | undefined) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return '—'
  }
  const pct = score * 100
  const decimals = Number.isInteger(pct) ? 0 : 1
  return `${pct.toFixed(decimals)}%`
}

function formatStat(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }
  return String(value)
}

function renderVerifierBadge(passed: VerifierPayload['verifier_passed']) {
  if (passed === true) {
    return (
      <span className="assistant-badge assistant-badge--verified">
        Verifier passed
      </span>
    )
  }
  if (passed === false) {
    return (
      <span className="assistant-badge assistant-badge--warning">
        Verifier failed
      </span>
    )
  }
  return (
    <span className="assistant-badge">Verifier status necunoscut</span>
  )
}

function VerifierPanel({
  verifier,
  refusalReason,
}: {
  verifier: VerifierPayload | null | undefined
  refusalReason: string | null | undefined
}) {
  const v = verifier ?? {}
  const passed = v.verifier_passed ?? null
  const repairApplied = v.repair_applied === true

  return (
    <article className="info-card assistant-section">
      <div className="assistant-meta-row">
        <h2 style={{ margin: 0 }}>Verifier</h2>
        {renderVerifierBadge(passed)}
      </div>

      {passed === false ? (
        <div className="assistant-status-banner assistant-status-banner--danger">
          Răspunsul nu a trecut verificarea completă. Verifică avertismentele
          și evidence-ul.
        </div>
      ) : null}

      {repairApplied ? (
        <div className="assistant-status-banner assistant-status-banner--info">
          A fost aplicată o reparare/refuzare automată pe baza verificării.
        </div>
      ) : null}

      {refusalReason ? (
        <div className="assistant-status-banner assistant-status-banner--danger">
          Refusal reason: {refusalReason}
        </div>
      ) : null}

      <dl className="assistant-verifier-grid">
        <div className="assistant-verifier-stat">
          <dt>groundedness_score</dt>
          <dd>{formatGroundedness(v.groundedness_score)}</dd>
        </div>
        <div className="assistant-verifier-stat">
          <dt>claims_total</dt>
          <dd>{formatStat(v.claims_total)}</dd>
        </div>
        <div className="assistant-verifier-stat">
          <dt>claims_supported</dt>
          <dd>{formatStat(v.claims_supported)}</dd>
        </div>
        <div className="assistant-verifier-stat">
          <dt>claims_weakly_supported</dt>
          <dd>{formatStat(v.claims_weakly_supported)}</dd>
        </div>
        <div className="assistant-verifier-stat">
          <dt>claims_unsupported</dt>
          <dd>{formatStat(v.claims_unsupported)}</dd>
        </div>
        <div className="assistant-verifier-stat">
          <dt>citations_checked</dt>
          <dd>{formatStat(v.citations_checked)}</dd>
        </div>
        <div className="assistant-verifier-stat">
          <dt>repair_applied</dt>
          <dd>
            {v.repair_applied == null ? 'indisponibil' : v.repair_applied ? 'da' : 'nu'}
          </dd>
        </div>
        <div className="assistant-verifier-stat">
          <dt>refusal_reason</dt>
          <dd>{v.refusal_reason ?? 'indisponibil'}</dd>
        </div>
      </dl>
    </article>
  )
}

function WarningsPanel({
  responseWarnings,
  verifierWarnings,
}: {
  responseWarnings: string[]
  verifierWarnings: string[]
}) {
  const hasResponse = responseWarnings.length > 0
  const hasVerifier = verifierWarnings.length > 0

  if (!hasResponse && !hasVerifier) {
    return (
      <article className="info-card assistant-warning-panel">
        <h2>Warnings</h2>
        <p className="assistant-empty">
          Nu există avertismente raportate de backend.
        </p>
      </article>
    )
  }

  return (
    <article className="info-card assistant-warning-panel">
      <h2>Warnings</h2>
      {hasResponse ? (
        <>
          <h3>response.warnings</h3>
          <ul className="assistant-warning-list">
            {responseWarnings.map((w, i) => (
              <li key={`resp-${i}`}>{w}</li>
            ))}
          </ul>
        </>
      ) : null}
      {hasVerifier ? (
        <>
          <h3>verifier.warnings</h3>
          <ul className="assistant-warning-list">
            {verifierWarnings.map((w, i) => (
              <li key={`ver-${i}`}>{w}</li>
            ))}
          </ul>
        </>
      ) : null}
    </article>
  )
}

function DebugPanel({ response }: { response: QueryResponse }) {
  const debug = response.debug
  const nodeCount = response.graph?.nodes?.length ?? 0
  const edgeCount = response.graph?.edges?.length ?? 0

  return (
    <article className="info-card assistant-section">
      <h2>Debug</h2>
      <dl className="assistant-meta">
        <dt>query_id</dt>
        <dd>
          <code>{response.query_id}</code>
        </dd>
        <dt>graph nodes</dt>
        <dd>{nodeCount}</dd>
        <dt>graph edges</dt>
        <dd>{edgeCount}</dd>
      </dl>
      {debug ? (
        <details className="assistant-debug-panel">
          <summary>Debug payload</summary>
          <pre className="assistant-debug-json">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      ) : (
        <p className="assistant-empty">
          Debug payload indisponibil. Asigură-te că request.debug=true.
        </p>
      )}
    </article>
  )
}

function HealthIndicator({
  status,
  message,
}: {
  status: HealthStatus
  message: string
}) {
  return (
    <div
      className={`assistant-health assistant-health--${status}`}
      aria-live="polite"
    >
      <span aria-hidden="true" />
      <strong>{message}</strong>
    </div>
  )
}

function LoadingPipeline() {
  return (
    <article className="info-card assistant-pipeline" aria-live="polite">
      <div>
        <h2>Se procesează întrebarea</h2>
        <p>Se construiește EvidencePack-ul...</p>
      </div>
      <ol>
        {PIPELINE_STEPS.map((step) => (
          <li className="assistant-pipeline-step" key={step}>
            {step}
          </li>
        ))}
      </ol>
    </article>
  )
}

function RefusalBanner({ response }: { response: QueryResponse }) {
  const warnings = getCombinedWarnings(response)
  const hasRefusal = Boolean(response.answer.refusal_reason)
  const verifierFailed = response.verifier?.verifier_passed === false
  const hasInsufficientEvidenceWarning = hasAnyWarning(
    warnings,
    INSUFFICIENT_EVIDENCE_WARNINGS,
  )

  if (!hasRefusal && !verifierFailed && !hasInsufficientEvidenceWarning) {
    return null
  }

  const retrievalUnavailable = hasAnyWarning(
    warnings,
    RETRIEVAL_UNAVAILABLE_WARNINGS,
  )

  return (
    <div className="assistant-refusal-banner" role="status">
      <strong>
        LexAI nu a putut produce un răspuns juridic susținut din evidence-ul
        disponibil.
      </strong>
      {retrievalUnavailable ? (
        <p>
          Retrieval/corpus indisponibil. Verifică DATABASE_URL și conexiunea la
          baza de date.
        </p>
      ) : null}
    </div>
  )
}

function BackendRunSummary({ response }: { response: QueryResponse }) {
  const nodeCount = response.graph?.nodes?.length ?? 0
  const edgeCount = response.graph?.edges?.length ?? 0
  const rawCandidatesCount = getRawCandidatesCount(response.debug)
  const warningsCount = getCombinedWarnings(response).length

  return (
    <article className="info-card assistant-run-summary">
      <div className="assistant-meta-row">
        <h2 style={{ margin: 0 }}>Backend run summary</h2>
        <span className="assistant-badge">smoke</span>
      </div>
      <dl className="assistant-run-summary-grid">
        <div>
          <dt>query_id</dt>
          <dd>
            <code>{response.query_id}</code>
          </dd>
        </div>
        <div>
          <dt>citations</dt>
          <dd>{response.citations?.length ?? 0}</dd>
        </div>
        <div>
          <dt>evidence_units</dt>
          <dd>{response.evidence_units?.length ?? 0}</dd>
        </div>
        <div>
          <dt>verifier_passed</dt>
          <dd>
            {response.verifier?.verifier_passed == null
              ? 'indisponibil'
              : response.verifier.verifier_passed
                ? 'true'
                : 'false'}
          </dd>
        </div>
        <div>
          <dt>warnings</dt>
          <dd>{warningsCount}</dd>
        </div>
        <div>
          <dt>graph nodes</dt>
          <dd>{nodeCount}</dd>
        </div>
        <div>
          <dt>graph edges</dt>
          <dd>{edgeCount}</dd>
        </div>
        {rawCandidatesCount != null ? (
          <div>
            <dt>raw candidates count</dt>
            <dd>{rawCandidatesCount}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  )
}

function AssistantPage() {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<QueryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AssistantError | null>(null)
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(
    null,
  )
  const [healthStatus, setHealthStatus] =
    useState<HealthStatus>('checking')
  const [healthMessage, setHealthMessage] = useState('Verific backend...')

  useEffect(() => {
    let ignore = false

    async function checkHealth() {
      try {
        const health = await getHealth()
        if (ignore) {
          return
        }

        const serviceLabel = health.service ? ` (${health.service})` : ''
        const statusLabel = health.status ? `: ${health.status}` : ''
        setHealthStatus('online')
        setHealthMessage(`Backend online${serviceLabel}${statusLabel}`)
      } catch {
        if (ignore) {
          return
        }
        setHealthStatus('offline')
        setHealthMessage('Backend offline')
      }
    }

    void checkHealth()

    return () => {
      ignore = true
    }
  }, [])

  const trimmed = question.trim()
  const submitDisabled = trimmed.length === 0 || isLoading

  async function submitQuestion(rawQuestion: string) {
    const nextQuestion = rawQuestion.trim()

    if (nextQuestion.length === 0 || isLoading) {
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)

    const request: QueryRequest = {
      question: nextQuestion,
      jurisdiction: 'RO',
      date: 'current',
      mode: 'strict_citations',
      debug: true,
    }

    try {
      const result = await postQuery(request)
      setResponse(result)
      setLastFailedQuestion(null)
    } catch (err) {
      setLastFailedQuestion(nextQuestion)
      setError({
        friendly: getFriendlyErrorMessage(err),
        raw: getRawErrorMessage(err),
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit() {
    void submitQuestion(question)
  }

  function handleRetry() {
    if (!lastFailedQuestion) {
      return
    }

    setQuestion(lastFailedQuestion)
    void submitQuestion(lastFailedQuestion)
  }

  const citations = response?.citations ?? []
  const evidenceUnits = response?.evidence_units ?? []

  return (
    <section className="page">
      <div className="section-header">
        <span className="eyebrow">Assistant route</span>
        <h1>Ask the assistant</h1>
        <p>
          Trimite o întrebare către LexAI. Răspunsul vine cu citări și evidence
          units din corpus-ul juridic românesc.
        </p>
        <HealthIndicator status={healthStatus} message={healthMessage} />
      </div>

      <article className="info-card assistant-card">
        <label htmlFor="assistant-question">
          <strong>Întrebarea ta</strong>
        </label>
        <textarea
          id="assistant-question"
          className="assistant-textarea"
          rows={4}
          placeholder="Ex: Poate angajatorul să-mi scadă salariul fără act adițional?"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={isLoading}
        />

        <div className="assistant-actions">
          <button
            type="button"
            className="assistant-btn assistant-btn--secondary"
            onClick={() => setQuestion(DEMO_QUESTION)}
            disabled={isLoading}
          >
            Demo question
          </button>
          <button
            type="button"
            className="assistant-btn assistant-btn--primary"
            onClick={handleSubmit}
            disabled={submitDisabled}
          >
            {isLoading ? 'Se procesează…' : 'Întreabă LexAI'}
          </button>
        </div>
      </article>

      {error ? (
        <article className="info-card assistant-error">
          <h2>Eroare</h2>
          <p>{error.friendly}</p>
          <div className="assistant-actions">
            {lastFailedQuestion ? (
              <button
                type="button"
                className="assistant-btn assistant-retry-button"
                onClick={handleRetry}
                disabled={isLoading}
              >
                Reîncearcă
              </button>
            ) : null}
          </div>
          <details className="assistant-error-details">
            <summary>Detalii tehnice</summary>
            <pre>{error.raw}</pre>
          </details>
        </article>
      ) : null}

      {isLoading ? <LoadingPipeline /> : null}

      {!response && !isLoading && !error ? (
        <article className="info-card assistant-section">
          <h2>Nicio rulare încă</h2>
          <p className="assistant-empty">
            Trimite o întrebare sau pornește de la întrebarea demo.
          </p>
        </article>
      ) : null}

      {response ? (
        <>
          <article className="info-card assistant-response">
            <h2>Răspuns</h2>
            <RefusalBanner response={response} />
            <p className="assistant-short-answer">
              {response.answer.short_answer ??
                'Backend response did not include answer.short_answer.'}
            </p>
            {response.answer.refusal_reason ? (
              <p className="assistant-refusal">
                <em>Refuz: {response.answer.refusal_reason}</em>
              </p>
            ) : null}

            <dl className="assistant-meta">
              <dt>query_id</dt>
              <dd>
                <code>{response.query_id}</code>
              </dd>
              <dt>citations</dt>
              <dd>{response.citations?.length ?? 0}</dd>
              <dt>evidence_units</dt>
              <dd>{response.evidence_units?.length ?? 0}</dd>
              <dt>warnings</dt>
              <dd>{response.warnings?.length ?? 0}</dd>
            </dl>
          </article>

          <BackendRunSummary response={response} />

          <article className="info-card assistant-section">
            <h2>Citări</h2>
            {citations.length === 0 ? (
              <p className="assistant-empty">
                Nu există citări verificate pentru acest răspuns.
              </p>
            ) : (
              <ul className="assistant-card-list">
                {citations.map((citation, index) => (
                  <CitationCardItem
                    key={getCitationKey(citation, index)}
                    citation={citation}
                    index={index}
                    evidenceUnits={evidenceUnits}
                  />
                ))}
              </ul>
            )}
          </article>

          <article className="info-card assistant-section">
            <h2>Evidence</h2>
            {evidenceUnits.length === 0 ? (
              <p className="assistant-empty">
                Backend-ul nu a returnat evidence units pentru acest răspuns.
              </p>
            ) : (
              <ul className="assistant-card-list">
                {evidenceUnits.map((unit) => (
                  <EvidenceCardItem key={unit.id} unit={unit} />
                ))}
              </ul>
            )}
          </article>

          <VerifierPanel
            verifier={response.verifier}
            refusalReason={response.answer.refusal_reason}
          />

          <WarningsPanel
            responseWarnings={response.warnings ?? []}
            verifierWarnings={response.verifier?.warnings ?? []}
          />

          <DebugPanel response={response} />
        </>
      ) : null}
    </section>
  )
}

export default AssistantPage
