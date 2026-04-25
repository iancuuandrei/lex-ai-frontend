import { useDeferredValue, useEffect, useRef, useState, type CSSProperties } from 'react'
import PromptComposer from '../components/PromptComposer'
import ProductBackgroundCanvas from '../components/product/ProductBackgroundCanvas'
import ProductKnowledgeGraph, {
  type ProductGraphEdge,
  type ProductGraphNode,
  type ProductNodeCategory,
} from '../components/product/ProductKnowledgeGraph'

const productFilters: Array<{ key: ProductNodeCategory; label: string }> = [
  { key: 'case', label: 'Cases' },
  { key: 'statute', label: 'Statutes' },
  { key: 'concept', label: 'Concepts' },
  { key: 'secondary', label: 'Secondary Sources' },
]

const productPromptIdeas = [
  'constructive dismissal in Canada',
  'leading authorities for unilateral change',
  'statutory context for employment termination',
  'recent cases discussing intolerable work conditions',
]

const productNodes: ProductGraphNode[] = [
  { id: 'constructive-dismissal', label: ['Constructive', 'Dismissal'], category: 'concept', icon: 'concept', emphasis: 'core', x: 54, y: 49 },
  { id: 'leading-cases', label: ['Leading Cases'], category: 'case', icon: 'case', emphasis: 'hub', x: 58, y: 22 },
  { id: 'bhasin-hrynew', label: ['Bhasin v. Hrynew', '(2014)'], category: 'case', icon: 'case', x: 45, y: 13 },
  { id: 'farber-royal-trust', label: ['Farber v. Royal', 'Trust Co.', '(1997)'], category: 'case', icon: 'case', x: 58, y: 8 },
  { id: 'wallace-united-grain', label: ['Wallace v. United', 'Grain Growers', '(1997)'], category: 'case', icon: 'case', x: 71, y: 14 },
  { id: 'potter-new-brunswick', label: ['Potter v. New Brunswick', 'Legal Aid Services', '(2004)'], category: 'case', icon: 'case', x: 85, y: 22 },
  { id: 'key-factors', label: ['Key Factors'], category: 'concept', icon: 'concept', emphasis: 'hub', x: 36, y: 53 },
  { id: 'fundamental-change', label: ['Fundamental Change', 'in Employment'], category: 'concept', icon: 'concept', x: 29, y: 38 },
  { id: 'unilateral-change', label: ['Unilateral Change', 'by Employer'], category: 'concept', icon: 'concept', x: 22, y: 51 },
  { id: 'without-cause', label: ['Without Just Cause', 'or Notice'], category: 'concept', icon: 'concept', x: 22, y: 64 },
  { id: 'intolerable-conditions', label: ['Intolerable', 'Work Conditions'], category: 'concept', icon: 'concept', x: 37, y: 69 },
  { id: 'statutory-context', label: ['Statutory Context'], category: 'statute', icon: 'statute', emphasis: 'hub', x: 75, y: 52 },
  { id: 'ontario-employment', label: ['Ontario Employment', 'Standards Act, 2000', 's. 57'], category: 'statute', icon: 'statute', x: 91, y: 39 },
  { id: 'canada-labour-code', label: ['Canada Labour', 'Code, R.S.C. 1985', 'c. L-2, s. 240'], category: 'statute', icon: 'statute', x: 96, y: 53 },
  { id: 'ontario-human-rights', label: ['Ontario Human Rights', 'Code, R.S.O. 1990', 'c. H.19, s. 5'], category: 'statute', icon: 'statute', x: 90, y: 68 },
  { id: 'scholarly-analysis', label: ['Scholarly Analysis'], category: 'secondary', icon: 'secondary', emphasis: 'hub', x: 54, y: 76 },
  { id: 'mckinley', label: ['McKinley on', 'Employment Law', '(7th Ed.)'], category: 'secondary', icon: 'secondary', x: 42, y: 88 },
  { id: 'brown-beatty', label: ['Brown & Beatty', 'Labour Law in Canada', '(4th Ed.)'], category: 'secondary', icon: 'secondary', x: 55, y: 93 },
  { id: 'hr-reporter', label: ['Canadian HR', 'Reporter Articles', '(2018-2024)'], category: 'secondary', icon: 'secondary', x: 70, y: 86 },
]

const productEdges: ProductGraphEdge[] = [
  { id: 'e1', source: 'constructive-dismissal', target: 'leading-cases', label: 'defined in', tone: 'case' },
  { id: 'e2', source: 'constructive-dismissal', target: 'key-factors', label: 'evaluated by', tone: 'concept' },
  { id: 'e3', source: 'constructive-dismissal', target: 'statutory-context', label: 'interpreted under', tone: 'statute' },
  { id: 'e4', source: 'constructive-dismissal', target: 'scholarly-analysis', label: 'discussed in', tone: 'secondary' },
  { id: 'e5', source: 'leading-cases', target: 'bhasin-hrynew', label: 'cites', tone: 'case' },
  { id: 'e6', source: 'leading-cases', target: 'farber-royal-trust', label: 'cites', tone: 'case' },
  { id: 'e7', source: 'leading-cases', target: 'wallace-united-grain', label: 'cites', tone: 'case' },
  { id: 'e8', source: 'leading-cases', target: 'potter-new-brunswick', label: 'cites', tone: 'case' },
  { id: 'e9', source: 'key-factors', target: 'fundamental-change', label: 'includes', tone: 'concept' },
  { id: 'e10', source: 'key-factors', target: 'unilateral-change', label: 'includes', tone: 'concept' },
  { id: 'e11', source: 'key-factors', target: 'without-cause', label: 'includes', tone: 'concept' },
  { id: 'e12', source: 'key-factors', target: 'intolerable-conditions', label: 'includes', tone: 'concept' },
  { id: 'e13', source: 'statutory-context', target: 'ontario-employment', label: 'relevant to', tone: 'statute' },
  { id: 'e14', source: 'statutory-context', target: 'canada-labour-code', label: 'relevant to', tone: 'statute' },
  { id: 'e15', source: 'statutory-context', target: 'ontario-human-rights', label: 'relevant to', tone: 'statute' },
  { id: 'e16', source: 'scholarly-analysis', target: 'mckinley', label: 'cites', tone: 'secondary' },
  { id: 'e17', source: 'scholarly-analysis', target: 'brown-beatty', label: 'cites', tone: 'secondary' },
  { id: 'e18', source: 'scholarly-analysis', target: 'hr-reporter', label: 'cites', tone: 'secondary' },
]

function ProductToolbarIcon({ kind }: { kind: 'graph' | 'list' | 'filter' | 'share' | 'search' | 'chevron' | 'spark' | 'message' | 'doc' | 'bookmark' | 'clock' | 'database' | 'settings' | 'plus' | 'send' }) {
  const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (kind) {
    case 'graph':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7a2 2 0 1 0 0 .01ZM18 5a2 2 0 1 0 0 .01ZM18 19a2 2 0 1 0 0 .01ZM6 17a2 2 0 1 0 0 .01ZM8 7h8m-8 10h8M7 9l4 6m6-6-4 6" {...strokeProps} />
        </svg>
      )
    case 'list':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6h10M9 12h10M9 18h10M5 6h.01M5 12h.01M5 18h.01" {...strokeProps} />
        </svg>
      )
    case 'filter':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" {...strokeProps} />
        </svg>
      )
    case 'share':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 7a3 3 0 1 0 0 .01ZM6 12a3 3 0 1 0 0 .01ZM16 17a3 3 0 1 0 0 .01ZM8.6 11l4.8-2.6m-4.8 4 4.8 2.6" {...strokeProps} />
        </svg>
      )
    case 'search':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m21 21-4.35-4.35M10.75 18a7.25 7.25 0 1 1 0-14.5 7.25 7.25 0 0 1 0 14.5Z" {...strokeProps} />
        </svg>
      )
    case 'chevron':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 10 5 5 5-5" {...strokeProps} />
        </svg>
      )
    case 'spark':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 4 1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4Zm6 12 1 2.4L21.5 19 19 20l-1 2.5L17 20l-2.5-1 2.5-.6 1-2.4Z" {...strokeProps} />
        </svg>
      )
    case 'message':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 17.5 3.5 20V6.5A2.5 2.5 0 0 1 6 4h12a2.5 2.5 0 0 1 2.5 2.5V15A2.5 2.5 0 0 1 18 17.5H7Z" {...strokeProps} />
        </svg>
      )
    case 'doc':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5H7Zm7 0V8h4" {...strokeProps} />
        </svg>
      )
    case 'bookmark':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3-6 3V5.5a1 1 0 0 1 1-1Z" {...strokeProps} />
        </svg>
      )
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 6.5V12l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" {...strokeProps} />
        </svg>
      )
    case 'database':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3Zm0 5c0 1.66 3.58 3 8 3s8-1.34 8-3M4 17c0 1.66 3.58 3 8 3s8-1.34 8-3M4 7v10m16-10v10" {...strokeProps} />
        </svg>
      )
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m10.5 3.7 1.5-.7 1.5.7.8 1.8 2 .7 1.6-.8 1 1-1 1.6.7 2 1.9.8v1.8l-1.9.8-.7 2 1 1.6-1 1-1.6-.8-2 .7-.8 1.8-1.5.7-1.5-.7-.8-1.8-2-.7-1.6.8-1-1 1-1.6-.7-2L3 12.7v-1.8l1.9-.8.7-2-1-1.6 1-1 1.6.8 2-.7.8-1.8ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" {...strokeProps} />
        </svg>
      )
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" {...strokeProps} />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14m-5-5 5-5 5 5" {...strokeProps} />
        </svg>
      )
  }
}

function ProductPage() {
  const showGraph = false
  const assistantMinWidth = 320
  const assistantMaxWidth = 720
  const assistantMobileBreakpoint = 760
  const assistantDefaultWidth = 420
  const assistantRef = useRef<HTMLElement | null>(null)
  const assistantResizeStartRef = useRef<{ x: number; width: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [promptValue, setPromptValue] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [assistantWidth, setAssistantWidth] = useState(assistantDefaultWidth)
  const [isAssistantCollapsed, setIsAssistantCollapsed] = useState(false)
  const [isResizingAssistant, setIsResizingAssistant] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<ProductNodeCategory, boolean>>({
    case: true,
    statute: true,
    concept: true,
    secondary: false,
  })

  const deferredSearchQuery = useDeferredValue(searchQuery)
  const normalizedSearch = deferredSearchQuery.trim().toLowerCase()
  const visibleNodes = productNodes.filter((node) => activeFilters[node.category])
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id))
  const visibleEdges = productEdges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  )
  const visibleNodeIndex = new Map(visibleNodes.map((node) => [node.id, node]))
  const matchingNodeIds = normalizedSearch.length === 0
    ? []
    : visibleNodes
      .filter((node) => node.label.join(' ').toLowerCase().includes(normalizedSearch))
      .map((node) => node.id)

  useEffect(() => {
    if (selectedNodeId && !visibleNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(null)
    }
  }, [selectedNodeId, visibleNodeIds])

  useEffect(() => {
    function getMaxAllowedWidth() {
      return Math.max(assistantMinWidth, Math.min(assistantMaxWidth, window.innerWidth - 180))
    }

    function syncAssistantWidth() {
      if (window.innerWidth <= assistantMobileBreakpoint) {
        setIsAssistantCollapsed(false)
        return
      }

      setAssistantWidth((current) => Math.min(current, getMaxAllowedWidth()))
    }

    syncAssistantWidth()
    window.addEventListener('resize', syncAssistantWidth)

    return () => {
      window.removeEventListener('resize', syncAssistantWidth)
    }
  }, [])

  useEffect(() => {
    if (!isResizingAssistant) {
      return
    }

    function getMaxAllowedWidth() {
      return Math.max(assistantMinWidth, Math.min(assistantMaxWidth, window.innerWidth - 180))
    }

    function handlePointerMove(event: MouseEvent) {
      if (!assistantRef.current || !assistantResizeStartRef.current || window.innerWidth <= assistantMobileBreakpoint) {
        return
      }

      const deltaX = event.clientX - assistantResizeStartRef.current.x
      const nextWidth = assistantResizeStartRef.current.width + deltaX
      const clampedWidth = Math.min(getMaxAllowedWidth(), Math.max(assistantMinWidth, nextWidth))
      setAssistantWidth(clampedWidth)
    }

    function handlePointerUp() {
      assistantResizeStartRef.current = null
      setIsResizingAssistant(false)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
    }
  }, [isResizingAssistant])

  function toggleFilter(category: ProductNodeCategory) {
    setActiveFilters((current) => ({
      ...current,
      [category]: !current[category],
    }))
  }

  function zoomIn() {
    setZoom((current) => Math.min(1.2, Number((current + 0.06).toFixed(2))))
  }

  function zoomOut() {
    setZoom((current) => Math.max(0.82, Number((current - 0.06).toFixed(2))))
  }

  function resetView() {
    setSearchQuery('')
    setSelectedNodeId(null)
    setZoom(1)
    setActiveFilters({
      case: true,
      statute: true,
      concept: true,
      secondary: false,
    })
  }

  const selectedNode = selectedNodeId ? visibleNodeIndex.get(selectedNodeId) : null
  const zoomPercent = Math.round(zoom * 100)
  const workspaceStyle = {
    '--product-assistant-width': isAssistantCollapsed ? '0px' : `${assistantWidth}px`,
  } as CSSProperties
  const workspaceClassName = [
    'product-workspace',
    showGraph ? '' : 'product-workspace--graph-hidden',
    isAssistantCollapsed ? 'product-workspace--assistant-collapsed' : '',
  ].filter(Boolean).join(' ')

  return (
    <section className="page page-product-studio">
      <ProductBackgroundCanvas />

      <div className={workspaceClassName} style={workspaceStyle}>
        <nav className="product-rail" aria-label="Workspace sections">
          <button
            type="button"
            className={`product-rail-button${!isAssistantCollapsed ? ' product-rail-button--active' : ''}`}
            aria-pressed={!isAssistantCollapsed}
            onClick={() => {
              setIsAssistantCollapsed((current) => !current)
            }}
          >
            <ProductToolbarIcon kind="message" />
          </button>
          <button
            type="button"
            className={`product-rail-button${isAssistantCollapsed ? ' product-rail-button--active' : ''}`}
          >
            <ProductToolbarIcon kind="graph" />
          </button>
          <button type="button" className="product-rail-button">
            <ProductToolbarIcon kind="doc" />
          </button>
          <button type="button" className="product-rail-button">
            <ProductToolbarIcon kind="bookmark" />
          </button>
          <button type="button" className="product-rail-button">
            <ProductToolbarIcon kind="clock" />
          </button>
          <button type="button" className="product-rail-button">
            <ProductToolbarIcon kind="database" />
          </button>
          <button type="button" className="product-rail-button product-rail-button--bottom">
            <ProductToolbarIcon kind="settings" />
          </button>
        </nav>

        <aside
          ref={assistantRef}
          className={`product-assistant${isAssistantCollapsed ? ' product-assistant--collapsed' : ''}`}
          aria-hidden={isAssistantCollapsed}
        >
          <button
            type="button"
            className={`product-assistant-resize-handle${isResizingAssistant ? ' is-active' : ''}`}
            aria-label="Resize assistant panel"
            onMouseDown={(event) => {
              if (window.innerWidth > assistantMobileBreakpoint && assistantRef.current) {
                assistantResizeStartRef.current = {
                  x: event.clientX,
                  width: assistantRef.current.getBoundingClientRect().width,
                }
                setIsAssistantCollapsed(false)
                setIsResizingAssistant(true)
              }
            }}
          />

          <div className="product-assistant-card">
            <div className="product-assistant-header">
              <div className="product-assistant-title">
                <ProductToolbarIcon kind="spark" />
                <strong>Lexi AI Assistant</strong>
              </div>

              <span className="product-ready-badge">
                <span />
                Ready
              </span>
            </div>

            <div className="product-assistant-scroll">
              <div className="product-chat-empty-state" aria-live="polite">
                <div className="product-chat-empty-icon">
                  <ProductToolbarIcon kind="spark" />
                </div>
                <strong>Start a new conversation</strong>
                <p>
                  Ask Lexi AI to explore the graph, compare authorities, or pull
                  statutory context from the current workspace.
                </p>
              </div>
            </div>

            <div className="product-composer">
              <PromptComposer
                className="product-prompt-card"
                promptPrefix="Ask Lexi AI about "
                promptIdeas={productPromptIdeas}
                value={promptValue}
                onChange={setPromptValue}
                ariaLabel="Ask a legal question or request"
              />
            </div>
          </div>
        </aside>

        {!showGraph ? <div className="product-workspace-spacer" aria-hidden="true" /> : null}

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
                  setSelectedNodeId((current) => (current === nodeId ? null : nodeId))
                }}
              />

              <article className="product-graph-panel">
                <div className="product-graph-panel-heading">
                  <div className="product-graph-panel-icon">
                    <ProductToolbarIcon kind="graph" />
                  </div>
                  <div>
                    <h2>Legal Knowledge Graph</h2>
                    <p>Explore legal concepts, cases, statutes and their relationships.</p>
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
                  <button type="button" onClick={resetView}>Clear all</button>
                </div>

                <div className="product-graph-filter-list">
                  {productFilters.map((filter) => (
                    <label key={filter.key} className="product-graph-filter-row">
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
                      <strong>{selectedNode.label.join(' ')}</strong>
                      <span>{selectedNode.category}</span>
                    </>
                  ) : (
                    <>
                      <strong>Focus any node</strong>
                      <span>Inspect its direct context without leaving the workspace.</span>
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
                <button type="button" className="product-graph-control" onClick={zoomIn}>
                  <ProductToolbarIcon kind="plus" />
                </button>
                <div className="product-graph-zoom-readout">{zoomPercent}%</div>
                <button type="button" className="product-graph-control" onClick={zoomOut}>
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
  )
}

export default ProductPage
