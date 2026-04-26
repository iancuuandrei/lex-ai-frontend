import {
  useDeferredValue,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import PromptComposer from "../components/PromptComposer";
import ProductBackgroundCanvas from "../components/product/ProductBackgroundCanvas";
import ProductForceGraph, {
  type ProductForceGraphHandle,
  type ProductForceGraphNode,
} from "../components/product/ProductForceGraph";
import ProductKnowledgeGraph, {
  type ProductGraphEdge,
  type ProductGraphNode,
  type ProductNodeCategory,
} from "../components/product/ProductKnowledgeGraph";
import { useSearchParams } from "react-router-dom";
import { getQueryGraph, postQuery, getProductGraph } from "../lib/api";
import type {
  Citation,
  EvidenceUnit,
  QueryGraphResponse,
  QueryResponse,
  VerifierPayload,
} from "../types/lexai";

const productFilters: Array<{ key: ProductNodeCategory; label: string }> = [
  { key: "case", label: "Cases" },
  { key: "statute", label: "Statutes" },
  { key: "concept", label: "Concepts" },
  { key: "secondary", label: "Secondary Sources" },
];

const productPromptIdeas = [
  "Poate angajatorul să-mi scadă salariul fără act adițional?",
  "Cum contest o amendă contravențională?",
  "Ce drepturi am dacă lucrez ore suplimentare?",
  "Când poate fi modificat contractul individual de muncă?",
  "Ce se întâmplă dacă circul fără ITP valabil?",
];

const queryPipelineSteps = [
  "Query understanding",
  "Retrieval",
  "EvidencePack",
  "Verifier",
  "Graph",
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "A apărut o eroare necunoscută.";
}

function citationLabel(citation: Citation, index: number) {
  return (
    citation.label ??
    citation.title ??
    citation.act_title ??
    citation.source ??
    citation.unit_id ??
    citation.evidence_unit_id ??
    citation.id ??
    `Citation ${index + 1}`
  );
}

function evidenceLabel(unit: EvidenceUnit, index: number) {
  return unit.label ?? unit.title ?? unit.source ?? unit.unit_id ?? unit.id ?? `Evidence ${index + 1}`;
}

function compactText(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim().length > 0));
}

function getRecordString(value: unknown, key: string) {
  if (typeof value !== "object" || value === null) return null;

  const field = (value as Record<string, unknown>)[key];
  if (typeof field === "string" && field.trim().length > 0) return field;
  if (typeof field === "number") return String(field);
  return null;
}

function getCitationText(citation: Citation) {
  return (
    citation.excerpt ??
    citation.quote ??
    citation.raw_text ??
    getRecordString(citation, "snippet") ??
    getRecordString(citation.metadata, "snippet") ??
    null
  );
}

function getCitationUrl(citation: Citation) {
  return citation.source_url ?? citation.url ?? null;
}

function getEvidenceLocation(unit: EvidenceUnit) {
  return compactText([
    unit.article_number != null ? `art. ${unit.article_number}` : null,
    unit.paragraph_number != null ? `alin. (${unit.paragraph_number})` : null,
    unit.letter_number != null ? `lit. ${unit.letter_number})` : null,
    unit.point_number != null ? `pct. ${unit.point_number}` : null,
  ]).join(", ");
}

function getEvidenceText(unit: EvidenceUnit) {
  return unit.raw_text ?? unit.excerpt ?? null;
}

function formatScore(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value.toFixed(3);
}

function formatGroundedness(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const pct = value * 100;
  return `${pct.toFixed(Number.isInteger(pct) ? 0 : 1)}%`;
}

function CorpusCoverageBadge() {
  return (
    <div className="product-corpus-badge" role="note">
      Corpus demo: legislație selectată. Răspunsurile sunt limitate la unitățile juridice indexate.
    </div>
  );
}

function ProductVerifierPanel({ verifier }: { verifier?: VerifierPayload | null }) {
  if (!verifier) {
    return (
      <article className="product-answer-card product-verifier-card product-verifier-card--warning">
        <span className="product-section-kicker">Verifier</span>
        <p>Verifier indisponibil în răspunsul backend.</p>
      </article>
    );
  }

  const groundedness = formatGroundedness(verifier.groundedness_score);
  const hasDanger = verifier.verifier_passed === false || Boolean(verifier.refusal_reason);

  return (
    <article className={`product-answer-card product-verifier-card${hasDanger ? " product-verifier-card--danger" : ""}`}>
      <div className="product-answer-section__header">
        <span className="product-section-kicker">Verifier</span>
        {verifier.verifier_passed != null ? (
          <span className={`product-status-pill${verifier.verifier_passed ? " product-status-pill--ok" : " product-status-pill--danger"}`}>
            verifier_passed={String(verifier.verifier_passed)}
          </span>
        ) : null}
      </div>

      <strong>{verifier.status ?? "status necunoscut"}</strong>

      {verifier.refusal_reason ? (
        <div className="product-warning-panel product-warning-panel--danger">
          <strong>Refusal reason</strong>
          <p>{verifier.refusal_reason}</p>
        </div>
      ) : null}

      <dl className="product-meta-grid">
        {groundedness ? (
          <div>
            <dt>groundedness_score</dt>
            <dd>{groundedness}</dd>
          </div>
        ) : null}
        {verifier.claims_supported != null ? (
          <div>
            <dt>claims_supported</dt>
            <dd>{verifier.claims_supported}</dd>
          </div>
        ) : null}
        {verifier.claims_unsupported != null ? (
          <div>
            <dt>claims_unsupported</dt>
            <dd>{verifier.claims_unsupported}</dd>
          </div>
        ) : null}
        {verifier.citations_checked != null ? (
          <div>
            <dt>citations_checked</dt>
            <dd>{verifier.citations_checked}</dd>
          </div>
        ) : null}
      </dl>

      {verifier.summary || verifier.rationale ? (
        <p>{verifier.summary ?? verifier.rationale}</p>
      ) : null}

      {verifier.warnings && verifier.warnings.length > 0 ? (
        <div className="product-warning-panel">
          <strong>Verifier warnings</strong>
          <ul className="product-warning-list">
            {verifier.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function ProductCitationCard({ citation, index }: { citation: Citation; index: number }) {
  const text = getCitationText(citation);
  const url = getCitationUrl(citation);
  const unitRefs = compactText([
    citation.unit_id ? `unit_id: ${citation.unit_id}` : null,
    citation.legal_unit_id ? `legal_unit_id: ${citation.legal_unit_id}` : null,
    citation.evidence_unit_id ? `evidence_unit_id: ${citation.evidence_unit_id}` : null,
  ]);

  return (
    <article className="product-citation-card">
      <strong>{citationLabel(citation, index)}</strong>

      {unitRefs.length > 0 ? (
        <div className="product-meta-line">
          {unitRefs.map((ref) => (
            <code key={ref}>{ref}</code>
          ))}
        </div>
      ) : null}

      {text ? (
        <blockquote className="product-legal-text">{text}</blockquote>
      ) : (
        <p className="product-muted-note">
          Backend-ul nu a inclus excerpt, quote, raw_text sau snippet pentru această citare.
        </p>
      )}

      {url ? (
        <a className="product-source-link" href={url} target="_blank" rel="noreferrer noopener">
          {url}
        </a>
      ) : null}
    </article>
  );
}

function ProductEvidenceCard({ unit, index }: { unit: EvidenceUnit; index: number }) {
  const text = getEvidenceText(unit);
  const location = getEvidenceLocation(unit);
  const retrievalScore = formatScore(unit.retrieval_score);
  const rerankScore = formatScore(unit.rerank_score);

  return (
    <article className="product-evidence-card">
      <div className="product-evidence-card__header">
        <strong>{evidenceLabel(unit, index)}</strong>
        {unit.support_role ? <span>{unit.support_role}</span> : null}
      </div>

      <div className="product-meta-line">
        <code>id: {unit.id}</code>
        {unit.unit_id ? <code>unit_id: {unit.unit_id}</code> : null}
      </div>

      {unit.law_title || location ? (
        <p className="product-muted-note">
          {compactText([unit.law_title, location]).join(" · ")}
        </p>
      ) : null}

      {retrievalScore || rerankScore ? (
        <div className="product-meta-line">
          {retrievalScore ? <code>retrieval_score: {retrievalScore}</code> : null}
          {rerankScore ? <code>rerank_score: {rerankScore}</code> : null}
        </div>
      ) : null}

      {text ? (
        <blockquote className="product-legal-text">{text}</blockquote>
      ) : (
        <p className="product-muted-note">Această evidence unit nu include raw_text sau excerpt.</p>
      )}

      {unit.why_selected ? (
        <p className="product-muted-note">
          <em>{unit.why_selected}</em>
        </p>
      ) : null}

      {unit.source_url ? (
        <a className="product-source-link" href={unit.source_url} target="_blank" rel="noreferrer noopener">
          {unit.source_url}
        </a>
      ) : null}
    </article>
  );
}

function ProductGraphStatus({
  queryResponse,
  queryGraph,
  graphError,
  isGraphLoading,
}: {
  queryResponse: QueryResponse | null;
  queryGraph: QueryGraphResponse | null;
  graphError: string | null;
  isGraphLoading: boolean;
}) {
  if (!queryResponse) return null;

  const stateClass = queryGraph
    ? " product-graph-ready--active"
    : graphError
      ? " product-graph-ready--warning"
      : "";
  const title = queryGraph
    ? "Graph ready"
    : graphError
      ? "Graph unavailable"
      : isGraphLoading
        ? "Graph loading"
        : "Graph pending";
  const detail = queryGraph
    ? `${queryGraph.graph.nodes.length} nodes / ${queryGraph.graph.edges.length} edges`
    : graphError
      ? "GET /api/query/{query_id}/graph failed"
      : "Waiting for /api/query/{query_id}/graph";

  return (
    <div className={`product-graph-ready${stateClass}`}>
      <span />
      <strong>{title}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ProductDebugDetails({
  response,
  queryGraph,
  graphError,
}: {
  response: QueryResponse;
  queryGraph: QueryGraphResponse | null;
  graphError: string | null;
}) {
  return (
    <details className="product-debug-details">
      <summary>Debug backend</summary>
      <dl className="product-meta-grid">
        <div>
          <dt>query_id</dt>
          <dd>{response.query_id}</dd>
        </div>
        <div>
          <dt>citations</dt>
          <dd>{response.citations.length}</dd>
        </div>
        <div>
          <dt>evidence_units</dt>
          <dd>{response.evidence_units.length}</dd>
        </div>
        <div>
          <dt>response warnings</dt>
          <dd>{response.warnings.length}</dd>
        </div>
        {queryGraph ? (
          <>
            <div>
              <dt>graph nodes</dt>
              <dd>{queryGraph.graph.nodes.length}</dd>
            </div>
            <div>
              <dt>graph edges</dt>
              <dd>{queryGraph.graph.edges.length}</dd>
            </div>
          </>
        ) : null}
        {graphError ? (
          <div>
            <dt>graph error</dt>
            <dd>{graphError}</dd>
          </div>
        ) : null}
      </dl>

      {response.debug ? (
        <pre className="product-debug-json">{JSON.stringify(response.debug, null, 2)}</pre>
      ) : (
        <p className="product-muted-note">Debug payload indisponibil în răspunsul backend.</p>
      )}
    </details>
  );
}

function ProductToolbarIcon({
  kind,
}: {
  kind:
    | "graph"
    | "list"
    | "filter"
    | "share"
    | "search"
    | "chevron"
    | "spark"
    | "message"
    | "doc"
    | "bookmark"
    | "clock"
    | "database"
    | "settings"
    | "plus"
    | "send";
}) {
  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (kind) {
    case "graph":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 7a2 2 0 1 0 0 .01ZM18 5a2 2 0 1 0 0 .01ZM18 19a2 2 0 1 0 0 .01ZM6 17a2 2 0 1 0 0 .01ZM8 7h8m-8 10h8M7 9l4 6m6-6-4 6"
            {...strokeProps}
          />
        </svg>
      );
    case "list":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9 6h10M9 12h10M9 18h10M5 6h.01M5 12h.01M5 18h.01"
            {...strokeProps}
          />
        </svg>
      );
    case "filter":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" {...strokeProps} />
        </svg>
      );
    case "share":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M16 7a3 3 0 1 0 0 .01ZM6 12a3 3 0 1 0 0 .01ZM16 17a3 3 0 1 0 0 .01ZM8.6 11l4.8-2.6m-4.8 4 4.8 2.6"
            {...strokeProps}
          />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m21 21-4.35-4.35M10.75 18a7.25 7.25 0 1 1 0-14.5 7.25 7.25 0 0 1 0 14.5Z"
            {...strokeProps}
          />
        </svg>
      );
    case "chevron":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 10 5 5 5-5" {...strokeProps} />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 4 1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4Zm6 12 1 2.4L21.5 19 19 20l-1 2.5L17 20l-2.5-1 2.5-.6 1-2.4Z"
            {...strokeProps}
          />
        </svg>
      );
    case "message":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 17.5 3.5 20V6.5A2.5 2.5 0 0 1 6 4h12a2.5 2.5 0 0 1 2.5 2.5V15A2.5 2.5 0 0 1 18 17.5H7Z"
            {...strokeProps}
          />
        </svg>
      );
    case "doc":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5H7Zm7 0V8h4"
            {...strokeProps}
          />
        </svg>
      );
    case "bookmark":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3-6 3V5.5a1 1 0 0 1 1-1Z"
            {...strokeProps}
          />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 6.5V12l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            {...strokeProps}
          />
        </svg>
      );
    case "database":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 7c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3Zm0 5c0 1.66 3.58 3 8 3s8-1.34 8-3M4 17c0 1.66 3.58 3 8 3s8-1.34 8-3M4 7v10m16-10v10"
            {...strokeProps}
          />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m10.5 3.7 1.5-.7 1.5.7.8 1.8 2 .7 1.6-.8 1 1-1 1.6.7 2 1.9.8v1.8l-1.9.8-.7 2 1 1.6-1 1-1.6-.8-2 .7-.8 1.8-1.5.7-1.5-.7-.8-1.8-2-.7-1.6.8-1-1 1-1.6-.7-2L3 12.7v-1.8l1.9-.8.7-2-1-1.6 1-1 1.6.8 2-.7.8-1.8ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            {...strokeProps}
          />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" {...strokeProps} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14m-5-5 5-5 5 5" {...strokeProps} />
        </svg>
      );
  }
}

function ProductPage() {
  const [searchParams] = useSearchParams();
  const showGraph = false;
  const assistantMinWidth = 360;
  const assistantMaxWidth = 900;
  const assistantMobileBreakpoint = 760;
  const getDefaultAssistantWidth = () => {
    if (typeof window === "undefined") {
      return 480;
    }
    return Math.min(
      assistantMaxWidth,
      Math.max(assistantMinWidth, Math.round(window.innerWidth * 0.3)),
    );
  };
  const forceGraphRef = useRef<ProductForceGraphHandle | null>(null);
  const assistantRef = useRef<HTMLElement | null>(null);
  const queryRequestSeqRef = useRef(0);
  const assistantResizeStartRef = useRef<{ x: number; width: number } | null>(
    null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [promptValue, setPromptValue] = useState(
    () => searchParams.get("q")?.trim() || "",
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [assistantWidth, setAssistantWidth] = useState(
    getDefaultAssistantWidth,
  );
  const [isAssistantCollapsed, setIsAssistantCollapsed] = useState(false);
  const [isResizingAssistant, setIsResizingAssistant] = useState(false);
  const [hideParagraphs, setHideParagraphs] = useState(false);
  const [discoveredNodes, setDiscoveredNodes] = useState<ProductForceGraphNode[]>([]);
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [queryGraph, setQueryGraph] = useState<QueryGraphResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Record<ProductNodeCategory, boolean>
  >({
    case: true,
    statute: true,
    concept: true,
    secondary: false,
  });

  const [productNodes, setProductNodes] = useState<ProductGraphNode[]>([]);
  const [productEdges, setProductEdges] = useState<ProductGraphEdge[]>([]);

  useEffect(() => {
    getProductGraph()
      .then(data => {
        setProductNodes(data.nodes as ProductGraphNode[]);
        setProductEdges(data.edges as ProductGraphEdge[]);
      })
      .catch(() => {
        console.warn("Product graph API unavailable, using local fallback");
      });
  }, []);

  const [isHighlightingPoints, setIsHighlightingPoints] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState(0);
  const [graphStats, setGraphStats] = useState({ totalNodes: 0, totalLinks: 0, articles: 0 });
  const [iteratingNodes, setIteratingNodes] = useState<ProductForceGraphNode[]>([]);
  const [currentIteratingIndex, setCurrentIteratingIndex] = useState(-1);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
  const visibleNodes = productNodes.filter(
    (node) => activeFilters[node.category],
  );
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = productEdges.filter(
    (edge) =>
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  );
  const visibleNodeIndex = new Map(visibleNodes.map((node) => [node.id, node]));
  const matchingNodeIds =
    normalizedSearch.length === 0
      ? []
      : visibleNodes
          .filter((node) =>
            node.label.join(" ").toLowerCase().includes(normalizedSearch),
          )
          .map((node) => node.id);

  useEffect(() => {
    function getMaxAllowedWidth() {
      return Math.max(
        assistantMinWidth,
        Math.min(assistantMaxWidth, window.innerWidth - 180),
      );
    }

    function syncAssistantWidth() {
      if (window.innerWidth <= assistantMobileBreakpoint) {
        setIsAssistantCollapsed(false);
        return;
      }

      setAssistantWidth((current) => Math.min(current, getMaxAllowedWidth()));
    }

    syncAssistantWidth();
    window.addEventListener("resize", syncAssistantWidth);

    return () => {
      window.removeEventListener("resize", syncAssistantWidth);
    };
  }, []);

  useEffect(() => {
    if (!isResizingAssistant) {
      return;
    }

    function getMaxAllowedWidth() {
      return Math.max(
        assistantMinWidth,
        Math.min(assistantMaxWidth, window.innerWidth - 180),
      );
    }

    function handlePointerMove(event: MouseEvent) {
      if (
        !assistantRef.current ||
        !assistantResizeStartRef.current ||
        window.innerWidth <= assistantMobileBreakpoint
      ) {
        return;
      }

      const deltaX = event.clientX - assistantResizeStartRef.current.x;
      const nextWidth = assistantResizeStartRef.current.width + deltaX;
      const clampedWidth = Math.min(
        getMaxAllowedWidth(),
        Math.max(assistantMinWidth, nextWidth),
      );
      setAssistantWidth(clampedWidth);
    }

    function handlePointerUp() {
      assistantResizeStartRef.current = null;
      setIsResizingAssistant(false);
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [isResizingAssistant]);

  function toggleFilter(category: ProductNodeCategory) {
    if (activeFilters[category] && selectedNodeId) {
      const selected = productNodes.find((node) => node.id === selectedNodeId);
      if (selected?.category === category) {
        setSelectedNodeId(null);
      }
    }

    setActiveFilters((current) => ({
      ...current,
      [category]: !current[category],
    }));
  }

  function zoomIn() {
    setZoom((current) => Math.min(1.2, Number((current + 0.06).toFixed(2))));
  }

  function zoomOut() {
    setZoom((current) => Math.max(0.82, Number((current - 0.06).toFixed(2))));
  }

  const handleSend = useCallback(async () => {
    const question = promptValue.trim();
    if (!question) return;

    const requestSeq = queryRequestSeqRef.current + 1;
    queryRequestSeqRef.current = requestSeq;

    setIsQueryLoading(true);
    setIsGraphLoading(false);
    setQueryError(null);
    setGraphError(null);
    setQueryResponse(null);
    setQueryGraph(null);
    setDiscoveredNodes([]);
    setIteratingNodes([]);
    setCurrentIteratingIndex(-1);
    setPromptValue("");

    try {
      const response = await postQuery({
        question,
        jurisdiction: "RO",
        date: "current",
        mode: "strict_citations",
        debug: true,
      });

      if (queryRequestSeqRef.current !== requestSeq) return;
      setQueryResponse(response);
      setIsQueryLoading(false);
      setIsGraphLoading(true);

      try {
        const graphResponse = await getQueryGraph(response.query_id);
        if (queryRequestSeqRef.current !== requestSeq) return;
        setQueryGraph(graphResponse);
        setGraphError(null);
      } catch (error) {
        if (queryRequestSeqRef.current !== requestSeq) return;
        setGraphError(getErrorMessage(error));
      } finally {
        if (queryRequestSeqRef.current === requestSeq) {
          setIsGraphLoading(false);
        }
      }
    } catch (error) {
      if (queryRequestSeqRef.current !== requestSeq) return;
      setQueryError(getErrorMessage(error));
      setQueryResponse(null);
      setQueryGraph(null);
      setGraphError(null);
    } finally {
      if (queryRequestSeqRef.current === requestSeq) {
        setIsQueryLoading(false);
      }
    }
  }, [promptValue]);

  const handleNodesDiscovered = useCallback((nodes: ProductForceGraphNode[]) => {
    setDiscoveredNodes(nodes);
  }, []);

  function resetView() {
    setSearchQuery("");
    setSelectedNodeId(null);
    setZoom(1);
    setActiveFilters({
      case: true,
      statute: true,
      concept: true,
      secondary: false,
    });
  }

  const selectedNode = selectedNodeId
    ? visibleNodeIndex.get(selectedNodeId)
    : null;
  const zoomPercent = Math.round(zoom * 100);
  const workspaceStyle = {
    "--product-assistant-width": isAssistantCollapsed
      ? "0px"
      : `${assistantWidth}px`,
  } as CSSProperties;
  const workspaceClassName = [
    "product-workspace",
    showGraph ? "" : "product-workspace--graph-hidden",
    isAssistantCollapsed ? "product-workspace--assistant-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="page page-product-studio">
      <ProductBackgroundCanvas />

      <div className={workspaceClassName} style={workspaceStyle}>
        <aside
          ref={assistantRef}
          className={`product-assistant${isAssistantCollapsed ? " product-assistant--collapsed" : ""}`}
          aria-hidden={isAssistantCollapsed}
        >
          <button
            type="button"
            className={`product-assistant-resize-handle${isResizingAssistant ? " is-active" : ""}`}
            aria-label="Resize assistant panel"
            onMouseDown={(event) => {
              if (
                window.innerWidth > assistantMobileBreakpoint &&
                assistantRef.current
              ) {
                assistantResizeStartRef.current = {
                  x: event.clientX,
                  width: assistantRef.current.getBoundingClientRect().width,
                };
                setIsAssistantCollapsed(false);
                setIsResizingAssistant(true);
              }
            }}
          />

          <div className="product-assistant-card">
            <div className="product-assistant-header">
              <div className="product-assistant-title">
                <ProductToolbarIcon kind="spark" />
                <strong>LexAI</strong>
              </div>

              <span className="product-ready-badge">
                <span />
                {isQueryLoading
                  ? "Running"
                  : queryGraph
                    ? "Graph ready"
                    : graphError
                      ? "Graph unavailable"
                      : isGraphLoading
                        ? "Graph loading"
                        : "Ready"}
              </span>
            </div>

            <div className="product-assistant-notice">
              <CorpusCoverageBadge />
            </div>

            <div className="product-assistant-scroll">
              {queryError ? (
                <div className="product-query-error" role="alert">
                  <strong>Request failed</strong>
                  <p>{queryError}</p>
                </div>
              ) : null}

              {isQueryLoading ? (
                <div className="product-pipeline-status" aria-live="polite">
                  <span className="product-section-kicker">Pipeline</span>
                  {queryPipelineSteps.map((step, index) => (
                    <div key={step} className="product-pipeline-row">
                      <span className="product-pipeline-dot" />
                      <span>{step}</span>
                      <small>{index === 0 ? "running" : "queued"}</small>
                    </div>
                  ))}
                </div>
              ) : queryResponse ? (
                <div className="product-answer-stack">
                  <article className="product-answer-card product-answer-card--primary">
                    <span className="product-section-kicker">Short answer</span>
                    <p>{queryResponse.answer.short_answer ?? "Backend response did not include answer.short_answer."}</p>
                    {queryResponse.answer.detailed_answer ? (
                      <details className="product-answer-details">
                        <summary>Detailed answer</summary>
                        <p>{queryResponse.answer.detailed_answer}</p>
                      </details>
                    ) : null}
                  </article>

                  {graphError ? (
                    <div className="product-warning-panel" role="status">
                      <strong>Răspunsul a fost primit, dar graful nu a putut fi încărcat.</strong>
                      <p>{graphError}</p>
                    </div>
                  ) : null}

                  <section className="product-answer-section">
                    <div className="product-answer-section__header">
                      <span className="product-section-kicker">Citations</span>
                      <strong>{queryResponse.citations.length}</strong>
                    </div>
                    {queryResponse.citations.length > 0 ? (
                      <div className="product-citation-list">
                        {queryResponse.citations.map((citation, index) => (
                          <ProductCitationCard
                            key={citation.id ?? citation.unit_id ?? citation.citation_id ?? index}
                            citation={citation}
                            index={index}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="product-empty-warning" role="status">
                        Backend-ul nu a returnat citări. Răspunsul nu trebuie tratat ca verificat.
                      </div>
                    )}
                  </section>

                  <ProductVerifierPanel verifier={queryResponse.verifier} />

                  {queryResponse.warnings.length > 0 ? (
                    <section className="product-answer-section">
                      <span className="product-section-kicker">Warnings</span>
                      <ul className="product-warning-list">
                        {queryResponse.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <section className="product-answer-section">
                    <div className="product-answer-section__header">
                      <span className="product-section-kicker">Evidence</span>
                      <strong>{queryResponse.evidence_units.length}</strong>
                    </div>
                    {queryResponse.evidence_units.length > 0 ? (
                      <div className="product-evidence-list">
                        {queryResponse.evidence_units.map((unit, index) => (
                          <ProductEvidenceCard key={unit.id ?? unit.unit_id ?? index} unit={unit} index={index} />
                        ))}
                      </div>
                    ) : (
                      <div className="product-empty-warning" role="status">
                        Backend-ul nu a returnat evidence units.
                      </div>
                    )}
                  </section>

                  <ProductGraphStatus
                    queryResponse={queryResponse}
                    queryGraph={queryGraph}
                    graphError={graphError}
                    isGraphLoading={isGraphLoading}
                  />

                  <ProductDebugDetails response={queryResponse} queryGraph={queryGraph} graphError={graphError} />
                </div>
              ) : queryError ? null : discoveredNodes.length > 0 ? (
                <div className="product-discovery-list">
                  {discoveredNodes.map((node) => (
                    <article key={node.id} className="product-discovery-banner">
                      <div className="product-discovery-banner__header">
                        <span className="product-discovery-banner__badge">
                          {node.category === "root" ? "§" :
                           node.category === "query" ? "Q" :
                           node.category === "claim" ? "Cl" :
                           node.category === "article" ? "Ar" :
                           node.category === "paragraph" ? "Al" :
                           node.category === "letter" ? "Lt" : "Pt"}
                        </span>
                        <strong className="product-discovery-banner__title">{node.label}</strong>
                      </div>
                      <p className="product-discovery-banner__path">{node.fullLabel}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="product-chat-empty-state" aria-live="polite">
                  <div className="product-chat-empty-icon">
                    <ProductToolbarIcon kind="spark" />
                  </div>
                  <strong>Întreabă ceva ca să construim traseul juridic.</strong>
                  <p className="product-muted-note">
                    LexAI va afișa răspunsul, citările, evidence-ul și graful juridic atunci când backend-ul returnează date verificabile.
                  </p>
                  
                  <div className="product-chat-suggestions">
                    <button className="product-chat-suggestion" onClick={() => setPromptValue("Poate angajatorul să-mi scadă salariul fără act adițional?")}>
                      <div className="product-chat-suggestion-icon"><ProductToolbarIcon kind="doc" /></div>
                      <div className="product-chat-suggestion-text">
                        <strong>Salariu modificat</strong>
                        <span>Act adițional și muncă</span>
                      </div>
                    </button>

                    <button className="product-chat-suggestion" onClick={() => setPromptValue("Cum contest o amendă contravențională?")}>
                      <div className="product-chat-suggestion-icon"><ProductToolbarIcon kind="graph" /></div>
                      <div className="product-chat-suggestion-text">
                        <strong>Amendă contravențională</strong>
                        <span>Contestare și termen</span>
                      </div>
                    </button>

                    <button className="product-chat-suggestion" onClick={() => setPromptValue("Ce drepturi am dacă lucrez ore suplimentare?")}>
                      <div className="product-chat-suggestion-icon"><ProductToolbarIcon kind="database" /></div>
                      <div className="product-chat-suggestion-text">
                        <strong>Ore suplimentare</strong>
                        <span>Drepturi și evidență</span>
                      </div>
                    </button>

                    <button className="product-chat-suggestion" onClick={() => setPromptValue("Ce se întâmplă dacă circul fără ITP valabil?")}>
                      <div className="product-chat-suggestion-icon"><ProductToolbarIcon kind="search" /></div>
                      <div className="product-chat-suggestion-text">
                        <strong>ITP valabil</strong>
                        <span>Circulație și sancțiuni</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="product-composer">
              {iteratingNodes.length > 0 ? (
                <div className="product-copilot-attachments">
                  {iteratingNodes.map((node, i) => (
                    <button 
                      key={node.id} 
                      className={`product-copilot-pill${i === currentIteratingIndex ? ' is-active' : ''}`}
                      onClick={() => {
                        setCurrentIteratingIndex(i);
                        forceGraphRef.current?.focusNode(node.id);
                      }}
                    >
                      <span className="product-copilot-pill__cat">{node.category.slice(0, 2)}</span>
                      <span className="product-copilot-pill__label">{node.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <PromptComposer
                className="product-prompt-card"
                promptPrefix=""
                promptIdeas={productPromptIdeas}
                value={promptValue}
                onChange={setPromptValue}
                onSend={handleSend}
                ariaLabel="Ask a legal question or request"
                secondaryButton={
                  queryGraph ? (
                  <button
                    type="button"
                    className={`prompt-icon-button${isHighlightingPoints ? " is-active" : ""}`}
                    disabled={isHighlightingPoints}
                    onClick={async () => {
                      if (forceGraphRef.current) {
                        setIsHighlightingPoints(true);
                        setIteratingNodes([]);
                        setCurrentIteratingIndex(-1);
                        setDiscoveryProgress(0);
                        try {
                          const nodes = await forceGraphRef.current.highlightPointsGradually(15, (p) => setDiscoveryProgress(p));
                          setIteratingNodes(nodes);
                          setGraphStats(forceGraphRef.current.getGraphStats());
                          if (nodes.length > 0) {
                            setCurrentIteratingIndex(-1);
                            forceGraphRef.current.focusOverview();
                          }
                        } finally {
                          setIsHighlightingPoints(false);
                        }
                      }
                    }}
                    title="Highlight random points"
                  >
                    {isHighlightingPoints ? (
                      <div className="product-discovery-counter">
                        {discoveryProgress}
                      </div>
                    ) : (
                      <ProductToolbarIcon kind="spark" />
                    )}
                  </button>
                  ) : null
                }
                toolbarExtra={
                  <label className="prompt-toggle" title="Hide alineat nodes">
                    <input
                      type="checkbox"
                      checked={hideParagraphs}
                      onChange={() => setHideParagraphs((v) => !v)}
                    />
                    <span className="prompt-toggle__track" />
                    <span className="prompt-toggle__label">Alin.</span>
                  </label>
                }
              />
            </div>
          </div>
        </aside>

        {!showGraph ? (
          <div className="product-workspace-spacer">
            <ProductForceGraph 
              ref={forceGraphRef} 
              hideParagraphs={hideParagraphs} 
              onNodesDiscovered={handleNodesDiscovered}
              queryGraph={queryGraph}
              highlightedNodeIds={queryGraph?.highlighted_node_ids}
              highlightedEdgeIds={queryGraph?.highlighted_edge_ids}
              disableLocalFallback
            />

            {iteratingNodes.length > 0 ? (
              <>
                {/* Iteration Widget */}
                <div className="product-iteration-widget">
                  <button
                    type="button"
                    className="product-iteration-btn"
                    onClick={() => {
                      const next = currentIteratingIndex === -1 ? iteratingNodes.length - 1 : currentIteratingIndex - 1;
                      setCurrentIteratingIndex(next);
                      if (next === -1) {
                        forceGraphRef.current?.focusOverview();
                      } else {
                        forceGraphRef.current?.focusNode(iteratingNodes[next].id);
                      }
                    }}
                  >
                    <ProductToolbarIcon kind="chevron" />
                  </button>
                  <div className="product-iteration-indicator">
                    {currentIteratingIndex === -1 ? (
                      <strong>Top</strong>
                    ) : (
                      <>
                        <strong>{currentIteratingIndex + 1}</strong>
                        <span>/</span>
                        <span>{iteratingNodes.length}</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="product-iteration-btn product-iteration-btn--next"
                    onClick={() => {
                      const next = currentIteratingIndex === iteratingNodes.length - 1 ? -1 : currentIteratingIndex + 1;
                      setCurrentIteratingIndex(next);
                      if (next === -1) {
                        forceGraphRef.current?.focusOverview();
                      } else {
                        forceGraphRef.current?.focusNode(iteratingNodes[next].id);
                      }
                    }}
                  >
                    <ProductToolbarIcon kind="chevron" />
                  </button>
                </div>

                {/* Info Banner */}
                <article className="product-iteration-banner">
                  {currentIteratingIndex === -1 ? (
                    <>
                      <div className="product-iteration-banner__header">
                        <span className="product-iteration-banner__badge">§</span>
                        <strong className="product-iteration-banner__title">Overview</strong>
                      </div>
                      <p className="product-iteration-banner__path">Knowledge Graph Map</p>
                      <div className="product-iteration-banner__content">
                        Showing all {iteratingNodes.length} matched articles across the legal framework. Use the arrows or pills to inspect individual connections.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="product-iteration-banner__header">
                        <span className="product-iteration-banner__badge">
                          {iteratingNodes[currentIteratingIndex].category.slice(0, 2).toUpperCase()}
                        </span>
                        <strong className="product-iteration-banner__title">
                          {iteratingNodes[currentIteratingIndex].label}
                        </strong>
                      </div>
                      <p className="product-iteration-banner__path">
                        {iteratingNodes[currentIteratingIndex].fullLabel}
                      </p>
                      <div className="product-iteration-banner__content">
                        {iteratingNodes[currentIteratingIndex].text}
                      </div>
                    </>
                  )}
                  
                  <div className="product-iteration-banner__stats">
                    <div className="product-iteration-stat">
                      <dt>Connected</dt>
                      <dd>{graphStats.totalLinks} edges</dd>
                    </div>
                    <div className="product-iteration-stat">
                      <dt>Articles</dt>
                      <dd>{graphStats.articles}</dd>
                    </div>
                    <div className="product-iteration-stat">
                      <dt>Total Nodes</dt>
                      <dd>{graphStats.totalNodes}</dd>
                    </div>
                  </div>

                  <div className="product-iteration-banner__footer">
                    <span>
                      {currentIteratingIndex === -1 
                        ? `Found ${iteratingNodes.length}/${graphStats.articles} relevant articles`
                        : `Matched ${currentIteratingIndex + 1}/${iteratingNodes.length} articles`
                      }
                    </span>
                    <div className="product-iteration-banner__progress-bar">
                      <div 
                        className="product-iteration-banner__progress-fill" 
                        style={{ 
                          width: currentIteratingIndex === -1 
                            ? '100%' 
                            : `${((currentIteratingIndex + 1) / iteratingNodes.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  <button 
                    className="product-iteration-banner__close"
                    onClick={() => {
                      setIteratingNodes([]);
                      setCurrentIteratingIndex(-1);
                    }}
                  >
                    ✕
                  </button>
                </article>
              </>
            ) : null}
          </div>
        ) : null}

        {showGraph ? (
          <section className="product-canvas">
            <div className="product-canvas-stage">
              <ProductKnowledgeGraph
                nodes={visibleNodes}
                edges={visibleEdges}
                selectedNodeId={selectedNodeId}
                highlightedNodeIds={matchingNodeIds}
                zoom={zoom}
                onNodeClick={(nodeId) => {
                  setSelectedNodeId((current) =>
                    current === nodeId ? null : nodeId,
                  );
                }}
              />

              <article className="product-graph-panel">
                <div className="product-graph-panel-heading">
                  <div className="product-graph-panel-icon">
                    <ProductToolbarIcon kind="graph" />
                  </div>
                  <div>
                    <h2>Legal Knowledge Graph</h2>
                    <p>
                      Explore legal concepts, cases, statutes and their
                      relationships.
                    </p>
                  </div>
                </div>

                <dl className="product-graph-stats">
                  <div>
                    <dt>Nodes</dt>
                    <dd>248</dd>
                  </div>
                  <div>
                    <dt>Edges</dt>
                    <dd>612</dd>
                  </div>
                  <div>
                    <dt>Sources</dt>
                    <dd>156</dd>
                  </div>
                  <div>
                    <dt>Jurisdictions</dt>
                    <dd>2</dd>
                  </div>
                </dl>

                <div className="product-graph-filter-header">
                  <strong>Filters</strong>
                  <button type="button" onClick={resetView}>
                    Clear all
                  </button>
                </div>

                <div className="product-graph-filter-list">
                  {productFilters.map((filter) => (
                    <label
                      key={filter.key}
                      className="product-graph-filter-row"
                    >
                      <span>{filter.label}</span>
                      <input
                        type="checkbox"
                        checked={activeFilters[filter.key]}
                        onChange={() => toggleFilter(filter.key)}
                      />
                    </label>
                  ))}
                </div>

                <div className="product-graph-jurisdiction">
                  <span>Jurisdiction:</span>
                  <strong>Canada</strong>
                  <span className="product-graph-jurisdiction-dot" />
                </div>

                <div className="product-graph-focus">
                  {selectedNode ? (
                    <>
                      <strong>{selectedNode.label.join(" ")}</strong>
                      <span>{selectedNode.category}</span>
                    </>
                  ) : (
                    <>
                      <strong>Focus any node</strong>
                      <span>
                        Inspect its direct context without leaving the
                        workspace.
                      </span>
                    </>
                  )}
                </div>
              </article>

              <div className="product-graph-controls">
                <button type="button" className="product-graph-control">
                  <span>✋</span>
                </button>
                <button type="button" className="product-graph-control">
                  <span>⌖</span>
                </button>
                <button type="button" className="product-graph-control">
                  <span>⤢</span>
                </button>
                <button
                  type="button"
                  className="product-graph-control"
                  onClick={zoomIn}
                >
                  <ProductToolbarIcon kind="plus" />
                </button>
                <div className="product-graph-zoom-readout">{zoomPercent}%</div>
                <button
                  type="button"
                  className="product-graph-control"
                  onClick={zoomOut}
                >
                  <span>−</span>
                </button>
              </div>

              <div className="product-minimap">
                <ProductKnowledgeGraph
                  nodes={visibleNodes}
                  edges={visibleEdges}
                  selectedNodeId={selectedNodeId}
                  highlightedNodeIds={matchingNodeIds}
                  mini
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

export default ProductPage;
