import Graph from 'graphology'
import type { GraphNode, GraphEdge } from '../../types/graph'
import { computeNodeSize, computeNodeColor } from './visual-scoring'

export function buildGraphologyGraph(nodes: GraphNode[], edges: GraphEdge[]): Graph {
  const graph = new Graph({ multi: true, type: 'directed' })

  for (const node of nodes) {
    graph.addNode(node.id, {
      label: node.label,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: computeNodeSize(node),
      color: computeNodeColor(node),
    })
  }

  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.addEdge(edge.source, edge.target, {
        label: edge.label,
        size: 1,
        color: '#334155',
      })
    }
  }

  return graph
}
