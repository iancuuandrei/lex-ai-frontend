import type { CSSProperties } from 'react'

export type ProductNodeCategory = 'case' | 'statute' | 'concept' | 'secondary'

export interface ProductGraphNode {
  id: string
  label: string[]
  category: ProductNodeCategory
  x: number
  y: number
  icon: ProductNodeCategory
  emphasis?: 'core' | 'hub' | 'standard'
}

export interface ProductGraphEdge {
  id: string
  source: string
  target: string
  label?: string
  tone?: ProductNodeCategory | 'neutral'
}

interface Props {
  nodes: ProductGraphNode[]
  edges: ProductGraphEdge[]
  selectedNodeId?: string | null
  highlightedNodeIds?: string[]
  zoom?: number
  mini?: boolean
  onNodeClick?: (nodeId: string) => void
}

function ProductGraphIcon({ kind }: { kind: ProductNodeCategory }) {
  if (kind === 'case') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v2m0 0 6 3m-6-3-6 3m6 8v3m0-3-5 2m5-2 5 2M6 9h12M8 9l-2 5h4L8 9Zm8 0-2 5h4l-2-5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'statute') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16M6 19V9m4 10V9m4 10V9m4 10V9M3 9h18M5 9l7-4 7 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'secondary') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5.5A2.5 2.5 0 0 1 9.5 3H19v15.5A2.5 2.5 0 0 0 16.5 16H7V5.5Zm0 0A2.5 2.5 0 0 0 4.5 8V21L7 19.5h9.5A2.5 2.5 0 0 1 19 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.75 14.35 8.5l5.25.76-3.8 3.7.9 5.24L12 15.8l-4.7 2.4.9-5.24-3.8-3.7 5.25-.76L12 3.75Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function getConnectedNodeIds(edges: ProductGraphEdge[], nodeId: string | null) {
  const connectedNodeIds = new Set<string>()

  if (!nodeId) return connectedNodeIds

  connectedNodeIds.add(nodeId)

  for (const edge of edges) {
    if (edge.source === nodeId) connectedNodeIds.add(edge.target)
    if (edge.target === nodeId) connectedNodeIds.add(edge.source)
  }

  return connectedNodeIds
}

export default function ProductKnowledgeGraph({
  nodes,
  edges,
  selectedNodeId = null,
  highlightedNodeIds = [],
  zoom = 1,
  mini = false,
  onNodeClick,
}: Props) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const highlightedSet = new Set(highlightedNodeIds)
  const connectedNodeIds = getConnectedNodeIds(edges, selectedNodeId)
  const hasHighlights = highlightedSet.size > 0

  return (
    <div className={`product-graph-surface${mini ? ' product-graph-surface--mini' : ''}`}>
      <div
        className="product-graph-surface-inner"
        style={mini ? undefined : { transform: `scale(${zoom})` }}
      >
        <svg className="product-graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map((edge) => {
            const source = nodeMap.get(edge.source)
            const target = nodeMap.get(edge.target)

            if (!source || !target) return null

            const isDimmed = selectedNodeId !== null && !connectedNodeIds.has(source.id) && !connectedNodeIds.has(target.id)
            const isHighlighted = selectedNodeId !== null && (source.id === selectedNodeId || target.id === selectedNodeId)

            return (
              <g
                key={edge.id}
                className={[
                  'product-graph-edge',
                  `product-graph-edge--${edge.tone ?? 'neutral'}`,
                  isDimmed ? 'is-dimmed' : '',
                  isHighlighted ? 'is-highlighted' : '',
                ].filter(Boolean).join(' ')}
              >
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
                {!mini && edge.label ? (
                  <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 1.2}>
                    {edge.label}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>

        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId
          const isConnected = connectedNodeIds.has(node.id)
          const isHighlighted = highlightedSet.has(node.id)
          const isDimmed = (selectedNodeId !== null && !isConnected) || (hasHighlights && !isHighlighted && !isSelected)
          const style = {
            left: `${node.x}%`,
            top: `${node.y}%`,
          } satisfies CSSProperties

          return (
            <button
              key={node.id}
              type="button"
              className={[
                'product-graph-node',
                `product-graph-node--${node.category}`,
                `product-graph-node--${node.emphasis ?? 'standard'}`,
                mini ? 'product-graph-node--mini' : '',
                isSelected ? 'is-selected' : '',
                isHighlighted ? 'is-highlighted' : '',
                isDimmed ? 'is-dimmed' : '',
              ].filter(Boolean).join(' ')}
              style={style}
              onClick={mini ? undefined : () => onNodeClick?.(node.id)}
              aria-label={node.label.join(' ')}
            >
              {mini ? null : (
                <>
                  <span className="product-graph-node-icon">
                    <ProductGraphIcon kind={node.icon} />
                  </span>
                  <span className="product-graph-node-label">
                    {node.label.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
