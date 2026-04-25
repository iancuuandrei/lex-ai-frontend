import { useEffect, useRef } from 'react'
import Sigma from 'sigma'
import type { GraphNode, GraphEdge } from '../../types/graph'
import { buildGraphologyGraph } from '../../lib/graph/graphology-builders'

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export default function SigmaGraphRenderer({ nodes, edges }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const graph = buildGraphologyGraph(nodes, edges)
    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeColor: '#334155',
      defaultNodeColor: '#475569',
    })

    return () => {
      sigma.kill()
    }
  }, [nodes, edges])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '600px' }}
    />
  )
}
