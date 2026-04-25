export type NodeType = 'root' | 'domain' | 'legal_act' | 'case' | 'party' | 'court'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  domain?: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
}
