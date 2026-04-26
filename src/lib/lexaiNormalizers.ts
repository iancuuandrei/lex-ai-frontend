import {
  CitationSchema,
  EvidenceUnitSchema,
  GraphEdgeSchema,
  GraphNodeSchema,
  GraphPayloadSchema,
  QueryGraphResponseSchema,
  QueryResponseSchema,
  WarningListSchema,
} from './lexaiSchemas'
import type {
  Citation,
  EvidenceUnit,
  GraphEdge,
  GraphNode,
  GraphPayload,
  QueryGraphResponse,
  QueryResponse,
} from '../types/lexai'

function presentString(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export function normalizeWarnings(value: unknown): string[] {
  return WarningListSchema.parse(value)
}

export function normalizeCitation(rawCitation: unknown, _index: number): Citation {
  void _index
  const parsed = CitationSchema.parse(rawCitation)

  return {
    ...parsed,
    metadata: parsed.metadata ?? null,
  }
}

export function normalizeEvidenceUnit(rawUnit: unknown, index: number): EvidenceUnit {
  const parsed = EvidenceUnitSchema.parse(rawUnit)
  const id = presentString(parsed.id) ?? presentString(parsed.unit_id) ?? `evidence-${index}`

  return {
    ...parsed,
    id,
    metadata: parsed.metadata ?? null,
  }
}

function normalizeGraphNode(rawNode: unknown): GraphNode {
  const parsed = GraphNodeSchema.parse(rawNode)

  return {
    ...parsed,
    id: parsed.id,
    label: presentString(parsed.label) ?? parsed.id,
    metadata: parsed.metadata ?? null,
  }
}

function normalizeGraphEdge(rawEdge: unknown, index: number): GraphEdge {
  const parsed = GraphEdgeSchema.parse(rawEdge)
  const typeOrEdgeType = presentString(parsed.type) ?? presentString(parsed.edge_type) ?? 'edge'

  return {
    ...parsed,
    id: presentString(parsed.id) ?? `${parsed.source}-${parsed.target}-${typeOrEdgeType}-${index}`,
    metadata: parsed.metadata ?? null,
  }
}

export function normalizeGraphPayload(raw: unknown): GraphPayload {
  const parsed = GraphPayloadSchema.parse(raw)

  return {
    ...parsed,
    nodes: parsed.nodes.map(normalizeGraphNode),
    edges: parsed.edges.map(normalizeGraphEdge),
  }
}

export function normalizeQueryResponse(raw: unknown): QueryResponse {
  const parsed = QueryResponseSchema.parse(raw)

  return {
    ...parsed,
    answer: parsed.answer,
    citations: parsed.citations.map(normalizeCitation),
    evidence_units: parsed.evidence_units.map(normalizeEvidenceUnit),
    verifier: parsed.verifier ?? null,
    graph: normalizeGraphPayload(parsed.graph),
    debug: parsed.debug ?? null,
    warnings: normalizeWarnings(parsed.warnings),
  }
}

export function normalizeQueryGraphResponse(raw: unknown): QueryGraphResponse {
  const parsed = QueryGraphResponseSchema.parse(raw)

  return {
    ...parsed,
    graph: normalizeGraphPayload(parsed.graph),
    highlighted_node_ids: parsed.highlighted_node_ids,
    highlighted_edge_ids: parsed.highlighted_edge_ids,
    cited_unit_ids: parsed.cited_unit_ids,
    reasoning_path: parsed.reasoning_path,
    verifier_summary: parsed.verifier_summary ?? null,
  }
}
