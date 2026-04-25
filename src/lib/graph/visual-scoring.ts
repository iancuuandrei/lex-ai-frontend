import type { GraphNode } from '../../types/graph'

const DOMAIN_COLORS: Record<string, string> = {
  civil: '#3b82f6',
  penal: '#ef4444',
  comercial: '#f59e0b',
  administrativ: '#10b981',
  constitutional: '#8b5cf6',
  fiscal: '#06b6d4',
  muncii: '#ec4899',
}

export function computeNodeSize(node: GraphNode): number {
  switch (node.type) {
    case 'root': return 30
    case 'domain': return 20
    case 'legal_act': return 14
    default: return 8
  }
}

export function computeNodeColor(node: GraphNode): string {
  switch (node.type) {
    case 'root': return '#ffffff'
    case 'domain': {
      const key = node.domain?.toLowerCase() ?? ''
      return DOMAIN_COLORS[key] ?? '#3b82f6'
    }
    case 'legal_act': return '#94a3b8'
    case 'case': return 'var(--accent, #6366f1)'
    case 'party': return '#c07a2e'
    case 'court': return '#2e7ab5'
    default: return '#475569'
  }
}
