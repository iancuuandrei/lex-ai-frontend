import { useMemo, useState, useRef, type FormEvent } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import SigmaGraphRenderer from '../components/explore/SigmaGraphRenderer';

const DOMAIN_CONFIG: Record<string, { color: string; label: string }> = {
  Muncă:  { color: '#2e7ab5', label: 'Muncă' },
  Civil:  { color: '#7c5cbc', label: 'Civil' },
  Penal:  { color: '#c07a2e', label: 'Penal' },
  Fiscal: { color: 'var(--accent)', label: 'Fiscal' },
};

function buildGraph(): Graph {
  const g = new Graph({ multi: false, type: 'undirected' });

  const nodes: { id: string; label: string; domain: string }[] = [
    { id: 'n1',  label: 'Codul Muncii',               domain: 'Muncă' },
    { id: 'n2',  label: 'Contract Individual',         domain: 'Muncă' },
    { id: 'n3',  label: 'Concediere Colectivă',        domain: 'Muncă' },
    { id: 'n4',  label: 'Sindicat',                    domain: 'Muncă' },
    { id: 'n5',  label: 'Salariu Minim',               domain: 'Muncă' },
    { id: 'n6',  label: 'Codul Civil',                 domain: 'Civil' },
    { id: 'n7',  label: 'Contract de Vânzare',         domain: 'Civil' },
    { id: 'n8',  label: 'Răspundere Civilă',           domain: 'Civil' },
    { id: 'n9',  label: 'Drept de Proprietate',        domain: 'Civil' },
    { id: 'n10', label: 'Succesiune',                  domain: 'Civil' },
    { id: 'n11', label: 'Codul Penal',                 domain: 'Penal' },
    { id: 'n12', label: 'Infracțiuni Contra Persoanei', domain: 'Penal' },
    { id: 'n13', label: 'Recidivă',                    domain: 'Penal' },
    { id: 'n14', label: 'Tentativă',                   domain: 'Penal' },
    { id: 'n15', label: 'Codul Fiscal',                domain: 'Fiscal' },
    { id: 'n16', label: 'TVA',                         domain: 'Fiscal' },
    { id: 'n17', label: 'Impozit pe Profit',           domain: 'Fiscal' },
    { id: 'n18', label: 'Executare Silită',            domain: 'Fiscal' },
  ];

  nodes.forEach(({ id, label, domain }, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    g.addNode(id, {
      label,
      domain,
      color: DOMAIN_CONFIG[domain]?.color ?? '#888',
      size: 8,
      x: Math.cos(angle),
      y: Math.sin(angle),
    });
  });

  const edges: [string, string][] = [
    ['n1', 'n2'], ['n1', 'n3'], ['n1', 'n4'], ['n1', 'n5'],
    ['n2', 'n3'], ['n4', 'n5'],
    ['n6', 'n7'], ['n6', 'n8'], ['n6', 'n9'], ['n6', 'n10'],
    ['n7', 'n8'], ['n9', 'n10'],
    ['n11', 'n12'], ['n11', 'n13'], ['n11', 'n14'],
    ['n12', 'n13'],
    ['n15', 'n16'], ['n15', 'n17'], ['n15', 'n18'],
    ['n2', 'n7'], ['n8', 'n12'], ['n17', 'n1'],
  ];

  edges.forEach(([s, t]) => {
    if (g.hasNode(s) && g.hasNode(t)) g.addEdge(s, t, { color: '#555', size: 1.5 });
  });

  forceAtlas2.assign(g, {
    iterations: 100,
    settings: forceAtlas2.inferSettings(g),
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
  const graph = useMemo(() => buildGraph(), []);

  const [hiddenDomains, setHiddenDomains] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedAttrs = selectedNodeId ? graph.getNodeAttributes(selectedNodeId) : null;

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

      <div className="graph-toolbar info-card">
        <SearchBar graph={graph} onSelect={setSelectedNodeId} />
        <DomainFilterBar hiddenDomains={hiddenDomains} onToggle={toggleDomain} />
      </div>

      <div className="graph-workspace">
        <div className="graph-canvas info-card" style={{ padding: 0, overflow: 'hidden' }}>
          <SigmaGraphRenderer
            graph={graph}
            hiddenDomains={hiddenDomains}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
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
    </section>
  );
}

export default GraphPage;
