import { useMemo, useState, useCallback, useRef, type FormEvent, useEffect } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import SigmaGraphRenderer from '../components/explore/SigmaGraphRenderer';
import { getExploreGraph } from '../lib/api';

const DOMAIN_CONFIG: Record<string, { color: string; label: string }> = {
  Muncă:  { color: '#2e7ab5', label: 'Muncă' },
  Civil:  { color: '#7c5cbc', label: 'Civil' },
  Penal:  { color: '#c07a2e', label: 'Penal' },
  Fiscal: { color: 'var(--accent)', label: 'Fiscal' },
};

function buildGraphFromData(data: { nodes: any[], edges: string[][] }): Graph {
  const g = new Graph({ multi: false, type: 'undirected' });

  data.nodes.forEach(({ id, label, domain, zoomLevel }, i) => {
    const angle = (i / data.nodes.length) * 2 * Math.PI;
    const radius = 100;
    const size = zoomLevel === 1 ? 12 : zoomLevel === 2 ? 8 : 5;
    g.addNode(id, {
      label,
      domain,
      zoomLevel,
      color: DOMAIN_CONFIG[domain]?.color ?? '#888',
      size,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  data.edges.forEach(([s, t]) => {
    if (g.hasNode(s) && g.hasNode(t)) g.addEdge(s, t, { color: 'rgba(150, 160, 180, 0.4)', size: 2 });
  });

  const inferred = forceAtlas2.inferSettings(g);
  forceAtlas2.assign(g, {
    iterations: 300,
    settings: {
      ...inferred,
      scalingRatio: (inferred.scalingRatio ?? 1) * 3,
      gravity: 0.2,
      strongGravityMode: false,
      barnesHutOptimize: true,
      linLogMode: true,
    },
  });

  return g;
}

interface SearchBarProps {
  graph: Graph;
  onSelect: (id: string | null) => void;
}

function SearchBar({ graph, onSelect }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const query = inputRef.current?.value.trim().toLowerCase() ?? '';
    if (!query) { onSelect(null); return; }

    let found: string | null = null;
    graph.forEachNode((nodeId, attrs) => {
      if (!found && (attrs.label as string).toLowerCase().includes(query)) {
        found = nodeId;
      }
    });

    onSelect(found);
    if (inputRef.current) {
      inputRef.current.style.borderColor = found ? '' : 'var(--error, #c0392b)';
    }
  }

  function handleChange() {
    if (inputRef.current) inputRef.current.style.borderColor = '';
  }

  return (
    <form className="graph-toolbar-search" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="graph-search-input"
        type="text"
        placeholder="Search nodes… (Enter)"
        aria-label="Search graph nodes"
        onChange={handleChange}
      />
    </form>
  );
}

interface DomainFilterBarProps {
  hiddenDomains: string[];
  onToggle: (domain: string) => void;
}

function DomainFilterBar({ hiddenDomains, onToggle }: DomainFilterBarProps) {
  return (
    <div className="graph-domain-filters">
      {Object.entries(DOMAIN_CONFIG).map(([domain, { color, label }]) => {
        const active = !hiddenDomains.includes(domain);
        return (
          <button
            key={domain}
            className={`graph-domain-badge${active ? ' graph-domain-badge--active' : ''}`}
            style={{ '--badge-color': color } as React.CSSProperties}
            onClick={() => onToggle(domain)}
            aria-pressed={active}
          >
            <span className="graph-domain-badge-dot" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function GraphPage() {
  const [graph, setGraph] = useState<Graph | null>(null);

  useEffect(() => {
    getExploreGraph().then(data => {
      setGraph(buildGraphFromData(data));
    });
  }, []);

  const [hiddenDomains, setHiddenDomains] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [autoFocusNodeId, setAutoFocusNodeId] = useState<string | null>(null);

  const handleAutoFocusDone = useCallback(() => setAutoFocusNodeId(null), []);

  const selectedAttrs = graph && selectedNodeId ? graph.getNodeAttributes(selectedNodeId) : null;

  function toggleDomain(domain: string) {
    setHiddenDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain],
    );
  }

  return (
    <section className="page">
      <div className="section-header">
        <span className="eyebrow">Graph Viewer</span>
        <h1>Knowledge Graph</h1>
        <p>Explore relationships between legal concepts, statutes, and domains.</p>
      </div>

      {graph ? (
        <>
          <div className="graph-toolbar info-card">
            <SearchBar graph={graph} onSelect={setSelectedNodeId} />
            <DomainFilterBar hiddenDomains={hiddenDomains} onToggle={toggleDomain} />
            <button
              className="graph-auto-focus-btn"
              disabled={autoFocusNodeId !== null}
              onClick={() => setAutoFocusNodeId('n6')}
            >
              {autoFocusNodeId ? 'Focusing…' : 'Auto-focus: Codul Civil'}
            </button>
          </div>

          <div className="graph-workspace">
            <div className="graph-canvas info-card" style={{ padding: 0, overflow: 'hidden' }}>
              <SigmaGraphRenderer
                graph={graph}
                hiddenDomains={hiddenDomains}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
                autoFocusNodeId={autoFocusNodeId}
                onAutoFocusDone={handleAutoFocusDone}
              />
            </div>

            <aside className="graph-sidebar">
              <article className="info-card graph-sidebar-card">
                <h2>Node Detail</h2>
                {selectedAttrs ? (
                  <dl className="graph-node-detail">
                    <dt>Label</dt>
                    <dd>{selectedAttrs.label as string}</dd>
                    <dt>Domain</dt>
                    <dd>
                      <span
                        className="graph-legend-dot"
                        style={{
                          background: DOMAIN_CONFIG[selectedAttrs.domain as string]?.color ?? '#888',
                          display: 'inline-block',
                          marginRight: 6,
                        }}
                      />
                      {selectedAttrs.domain as string}
                    </dd>
                  </dl>
                ) : (
                  <p className="graph-empty-hint">Select a node to inspect its properties.</p>
                )}
              </article>

              <article className="info-card graph-sidebar-card">
                <h2>Legend</h2>
                <ul className="graph-legend">
                  {Object.entries(DOMAIN_CONFIG).map(([domain, { color, label }]) => (
                    <li key={domain} className="graph-legend-item">
                      <span className="graph-legend-dot" style={{ background: color }} />
                      {label}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="info-card graph-sidebar-card">
                <h2>Filters</h2>
                <ul className="graph-filter-list">
                  {Object.entries(DOMAIN_CONFIG).map(([domain, { color, label }]) => (
                    <li key={domain} className="graph-filter-item">
                      <label className="graph-filter-label">
                        <input
                          type="checkbox"
                          checked={!hiddenDomains.includes(domain)}
                          onChange={() => toggleDomain(domain)}
                        />
                        <span className="graph-legend-dot" style={{ background: color }} />
                        {label}
                      </label>
                    </li>
                  ))}
                </ul>
              </article>
            </aside>
          </div>
        </>
      ) : (
        <div className="info-card">
          <p>Loading graph...</p>
        </div>
      )}
    </section>
  );
}

export default GraphPage;
