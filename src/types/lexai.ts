export interface QueryRequest {
  question: string
  jurisdiction: string
  date: string
  mode: 'strict_citations' | (string & {})
  debug?: boolean
}

export interface AnswerPayload {
  short_answer?: string | null
  detailed_answer?: string | null
  confidence?: number | null
  not_legal_advice?: boolean | null
  refusal_reason?: string | null
}

export interface Citation {
  id?: string | null
  citation_id?: string | null
  unit_id?: string | null
  legal_unit_id?: string | null
  evidence_unit_id?: string | null
  node_id?: string | null
  label?: string | null
  title?: string | null
  source?: string | null
  act_title?: string | null
  article?: string | number | null
  paragraph?: string | number | null
  excerpt?: string | null
  quote?: string | null
  raw_text?: string | null
  snippet?: string | null
  url?: string | null
  source_url?: string | null
  verified?: boolean | null
  metadata?: Record<string, unknown> | null
}

export interface EvidenceUnit {
  id: string
  unit_id?: string | null
  node_id?: string | null
  type?: string | null
  label?: string | null
  title?: string | null
  source?: string | null
  excerpt?: string | null
  raw_text?: string | null
  score?: number | null
  metadata?: Record<string, unknown> | null
  law_id?: string | null
  law_title?: string | null
  status?: string | null
  hierarchy_path?: string[] | string | null
  article_number?: string | number | null
  paragraph_number?: string | number | null
  letter_number?: string | number | null
  point_number?: string | number | null
  legal_domain?: string | null
  source_url?: string | null
  support_role?: string | null
  retrieval_score?: number | null
  rerank_score?: number | null
  score_breakdown?: Record<string, unknown> | null
  why_selected?: string | null
}

export type VerifierStatus =
  | 'passed'
  | 'failed'
  | 'warning'
  | 'verified'
  | 'needs_review'
  | 'insufficient_evidence'
  | 'unknown'
  | (string & {})

export interface VerifierPayload {
  status?: VerifierStatus | null
  summary?: string | null
  rationale?: string | null
  confidence?: number | null
  metadata?: Record<string, unknown> | null
  groundedness_score?: number | null
  claims_total?: number | null
  claims_supported?: number | null
  claims_weakly_supported?: number | null
  claims_unsupported?: number | null
  citations_checked?: number | null
  verifier_passed?: boolean | null
  warnings?: string[] | null
  repair_applied?: boolean | null
  refusal_reason?: string | null
}

export type GraphNodeType =
  | 'query'
  | 'cited_claim'
  | 'article'
  | 'paragraph'
  | 'letter'
  | 'point'
  | 'legal_act'
  | 'domain'
  | 'root'
  | (string & {})

export interface GraphNode {
  id: string
  label: string
  type?: GraphNodeType | null
  node_type?: GraphNodeType | null
  metadata?: Record<string, unknown> | null
}

export type GraphEdgeType =
  | 'contains'
  | 'retrieved_for_query'
  | 'cited_in_answer'
  | 'supports_claim'
  | (string & {})

export interface GraphEdge {
  id?: string | null
  source: string
  target: string
  type?: GraphEdgeType | null
  edge_type?: GraphEdgeType | null
  label?: string | null
  metadata?: Record<string, unknown> | null
  weight?: number | null
  confidence?: number | null
  explanation?: string | null
}

export interface GraphPayload {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface QueryResponse {
  query_id: string
  question: string
  answer: AnswerPayload
  citations: Citation[]
  evidence_units: EvidenceUnit[]
  verifier?: VerifierPayload | null
  graph: GraphPayload
  debug?: Record<string, unknown> | null
  warnings: string[]
}

export interface ReasoningPathItem {
  node_id?: string | null
  edge_id?: string | null
  label?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
}

export interface QueryGraphResponse {
  query_id: string
  question: string
  graph: GraphPayload
  highlighted_node_ids: string[]
  highlighted_edge_ids: string[]
  cited_unit_ids: string[]
  reasoning_path: Array<string | ReasoningPathItem>
  verifier_summary?: string | Record<string, unknown> | null
}

export interface Suggestion {
  id: string
  text: string
}

export interface LibraryItem {
  id: string
  title: string
  description: string
  type: string
}
